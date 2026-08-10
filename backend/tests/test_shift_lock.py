"""test_shift_lock.py — Cross-shift edit lock & admin override tests.

Uses the shared in-memory SQLite engine from conftest.py.
The autouse setup_test_db fixture creates tables + ADMIN user (id=1) before
each test and drops all tables after. We add a CLINICAL user (id=2) inside
the as_clinical fixture using the same TestingSessionLocal.
"""

from datetime import datetime, timedelta

import pytest

from tests.conftest import TestingSessionLocal

from app.main import app
from app.models import (
    FluidRecord, Patient, FluidType, FluidDirection,
    User, UserRole, VitalSignRecord,
)
from app.security import get_current_user


# ──────────────────────────────────────────────────────────────────────────────
# Timestamp helpers
# ──────────────────────────────────────────────────────────────────────────────

def _yesterday_shift_time() -> str:
    """ISO timestamp firmly inside yesterday's already-closed shift."""
    yesterday = (datetime.now() - timedelta(days=1)).date()
    return f"{yesterday}T09:00:00"


def _today_shift_time() -> str:
    """ISO timestamp inside today's open shift (started 07:00 today)."""
    today = datetime.now().date()
    return f"{today}T08:00:00"


# ──────────────────────────────────────────────────────────────────────────────
# DB helpers — bypass API for test setup, use shared test DB directly
# ──────────────────────────────────────────────────────────────────────────────

_COUNTER = {"n": 0}


def _get_db():
    return TestingSessionLocal()


def _create_patient_in_db(suffix: str) -> int:
    """Insert a patient directly via the shared test DB, bypassing auth."""
    _COUNTER["n"] += 1
    db = _get_db()
    p = Patient(
        medical_record=f"REC-{suffix}-{_COUNTER['n']}",
        full_name=f"Paciente Lock {suffix}",
        birth_date=datetime(1985, 5, 15),
        bed="UTI 01",
        is_active=True,
    )
    db.add(p)
    db.commit()
    pid = p.id
    db.close()
    return pid


def _create_fluid_record_in_db(
    patient_id: int,
    occurred_at_str: str,
    category: str = "IV_HYDRATION",
    vol: float = 200.0,
) -> int:
    """Insert a FluidRecord directly via the shared test DB (as admin user=1)."""
    db = _get_db()
    rec = FluidRecord(
        patient_id=patient_id,
        registered_by_id=1,
        direction=FluidDirection.INPUT,
        category=FluidType[category],
        volume_ml=vol,
        occurred_at=datetime.fromisoformat(occurred_at_str),
    )
    db.add(rec)
    db.commit()
    rid = rec.id
    db.close()
    return rid


def _create_vitals_record_in_db(patient_id: int, occurred_at_str: str) -> int:
    """Insert a VitalSignRecord directly via the shared test DB (as admin user=1)."""
    db = _get_db()
    rec = VitalSignRecord(
        patient_id=patient_id,
        registered_by_id=1,
        occurred_at=datetime.fromisoformat(occurred_at_str),
        pulse=72,
    )
    db.add(rec)
    db.commit()
    rid = rec.id
    db.close()
    return rid


# ──────────────────────────────────────────────────────────────────────────────
# Role-switching fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def as_clinical(client):
    """Override get_current_user to return a CLINICAL user (id=2)."""
    db = _get_db()
    if not db.get(User, 2):
        db.add(User(
            id=2,
            username="clinical",
            full_name="Nurse Clinical",
            email="clinical@hospital.com",
            password_hash="fakehash",
            role=UserRole.CLINICAL,
            is_active=True,
        ))
        db.commit()
    db.close()

    original = app.dependency_overrides.get(get_current_user)

    def get_clinical_user():
        db2 = _get_db()
        u = db2.get(User, 2)
        db2.close()
        return u

    app.dependency_overrides[get_current_user] = get_clinical_user
    yield client
    if original is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = original


@pytest.fixture
def as_admin(client):
    """Override get_current_user to return the ADMIN user (id=1)."""
    original = app.dependency_overrides.get(get_current_user)

    def get_admin_user():
        db2 = _get_db()
        u = db2.get(User, 1)
        db2.close()
        return u

    app.dependency_overrides[get_current_user] = get_admin_user
    yield client
    if original is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = original


# ──────────────────────────────────────────────────────────────────────────────
# Fluid record shift-lock tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFluidShiftLock:

    def test_clinical_patch_yesterday_shift_403(self, as_clinical, client):
        """CLINICAL cannot PATCH a fluid record from a closed shift."""
        pid = _create_patient_in_db("LOCK-CP-01")
        record_id = _create_fluid_record_in_db(pid, _yesterday_shift_time())
        res = as_clinical.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": 500})
        assert res.status_code == 403, res.text
        assert "plantão" in res.json()["detail"].lower()

    def test_admin_patch_yesterday_shift_200(self, as_admin, client):
        """ADMIN CAN PATCH a fluid record from a closed shift."""
        pid = _create_patient_in_db("LOCK-AP-01")
        record_id = _create_fluid_record_in_db(pid, _yesterday_shift_time())
        res = as_admin.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": 999})
        assert res.status_code == 200, res.text
        db = _get_db()
        rec = db.get(FluidRecord, record_id)
        db.close()
        assert rec.volume_ml == 999.0

    def test_clinical_delete_yesterday_shift_403(self, as_clinical, client):
        """CLINICAL cannot DELETE a fluid record from a closed shift."""
        pid = _create_patient_in_db("LOCK-CD-01")
        record_id = _create_fluid_record_in_db(pid, _yesterday_shift_time())
        res = as_clinical.delete(f"/api/v1/balances/records/{record_id}")
        assert res.status_code == 403, res.text

    def test_admin_delete_yesterday_shift_204(self, as_admin, client):
        """ADMIN CAN DELETE a fluid record from a closed shift."""
        pid = _create_patient_in_db("LOCK-AD-01")
        record_id = _create_fluid_record_in_db(pid, _yesterday_shift_time())
        res = as_admin.delete(f"/api/v1/balances/records/{record_id}")
        assert res.status_code == 204, res.text

    def test_clinical_post_upsert_yesterday_shift_403(self, as_clinical, client):
        """CLINICAL cannot POST-upsert a single-value record in a closed shift."""
        pid = _create_patient_in_db("LOCK-CU-01")
        occurred_at = _yesterday_shift_time()
        # Pre-insert row as admin directly in DB
        _create_fluid_record_in_db(pid, occurred_at)
        # Second POST as clinical — hits upsert branch; shift closed → 403
        r2 = as_clinical.post("/api/v1/balances/records", json={
            "patient_id": pid, "direction": "INPUT",
            "category": "IV_HYDRATION", "volume_ml": 200, "occurred_at": occurred_at,
        })
        assert r2.status_code == 403, r2.text

    def test_admin_post_upsert_yesterday_shift_200(self, as_admin, client):
        """ADMIN CAN POST-upsert a single-value record in a closed shift."""
        pid = _create_patient_in_db("LOCK-AU-01")
        occurred_at = _yesterday_shift_time()
        _create_fluid_record_in_db(pid, occurred_at)
        r2 = as_admin.post("/api/v1/balances/records", json={
            "patient_id": pid, "direction": "INPUT",
            "category": "IV_HYDRATION", "volume_ml": 300, "occurred_at": occurred_at,
        })
        assert r2.status_code == 201, r2.text

    def test_clinical_patch_current_shift_200(self, as_clinical, client):
        """Regression guard: CLINICAL CAN PATCH a record in the current open shift."""
        pid = _create_patient_in_db("LOCK-OPEN-01")
        record_id = _create_fluid_record_in_db(pid, _today_shift_time(), category="URINE", vol=100)
        res = as_clinical.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": 150})
        assert res.status_code == 200, res.text

    def test_updated_by_id_set_on_admin_edit(self, as_admin, client):
        """updated_by_id is stamped on a successful ADMIN edit of a FluidRecord."""
        pid = _create_patient_in_db("LOCK-AUDIT-01")
        record_id = _create_fluid_record_in_db(pid, _yesterday_shift_time())
        res = as_admin.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": 777})
        assert res.status_code == 200, res.text
        db = _get_db()
        rec = db.get(FluidRecord, record_id)
        db.close()
        assert rec.updated_by_id == 1  # ADMIN user id=1


# ──────────────────────────────────────────────────────────────────────────────
# Vital sign shift-lock tests
# ──────────────────────────────────────────────────────────────────────────────

class TestVitalsShiftLock:

    def test_clinical_patch_vitals_yesterday_shift_403(self, as_clinical, client):
        """CLINICAL cannot PATCH vitals from a closed shift."""
        pid = _create_patient_in_db("VLOCK-CP-01")
        record_id = _create_vitals_record_in_db(pid, _yesterday_shift_time())
        res = as_clinical.patch(f"/api/v1/vitals/records/{record_id}", json={"pulse": 99})
        assert res.status_code == 403, res.text

    def test_admin_patch_vitals_yesterday_shift_200(self, as_admin, client):
        """ADMIN CAN PATCH vitals from a closed shift; updated_by_id is set."""
        pid = _create_patient_in_db("VLOCK-AP-01")
        record_id = _create_vitals_record_in_db(pid, _yesterday_shift_time())
        res = as_admin.patch(f"/api/v1/vitals/records/{record_id}", json={"pulse": 88})
        assert res.status_code == 200, res.text
        db = _get_db()
        rec = db.get(VitalSignRecord, record_id)
        db.close()
        assert rec.pulse == 88
        assert rec.updated_by_id == 1  # ADMIN user id=1

    def test_clinical_vitals_upsert_yesterday_shift_403(self, as_clinical, client):
        """CLINICAL cannot POST-upsert vitals from a closed shift."""
        pid = _create_patient_in_db("VLOCK-CU-01")
        occurred_at = _yesterday_shift_time()
        _create_vitals_record_in_db(pid, occurred_at)
        r2 = as_clinical.post("/api/v1/vitals/records", json={
            "patient_id": pid, "occurred_at": occurred_at, "pulse": 90,
        })
        assert r2.status_code == 403, r2.text

    def test_clinical_vitals_current_shift_200(self, as_clinical, client):
        """Regression guard: CLINICAL CAN update vitals in the current open shift."""
        pid = _create_patient_in_db("VLOCK-OPEN-01")
        record_id = _create_vitals_record_in_db(pid, _today_shift_time())
        res = as_clinical.patch(f"/api/v1/vitals/records/{record_id}", json={"pulse": 88})
        assert res.status_code == 200, res.text

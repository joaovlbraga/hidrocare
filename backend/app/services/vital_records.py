from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Patient, User, VitalSignRecord
from app.schemas import VitalSignCreate, VitalSignUpdate
from app.services.record_permissions import assert_can_create_at, assert_can_edit


def create_or_upsert_vital(db: Session, payload: VitalSignCreate, current_user: User):
    if not db.get(Patient, payload.patient_id):
        raise ValueError("Paciente não encontrado")



    existing = db.scalar(
        select(VitalSignRecord).where(
            VitalSignRecord.patient_id == payload.patient_id,
            VitalSignRecord.occurred_at == payload.occurred_at,
        )
    )

    if existing:
        assert_can_edit(existing, current_user, skip_ownership=True)
        update_data = payload.model_dump(exclude_unset=True, exclude={"patient_id", "occurred_at"})
        for field, val in update_data.items():
            setattr(existing, field, val)
        existing.updated_by_id = current_user.id
        db.commit()
        db.refresh(existing)
        return existing

    assert_can_create_at(payload.occurred_at, current_user)
    record = VitalSignRecord(**payload.model_dump(), registered_by_id=current_user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_vital(db: Session, record_id: int, payload: VitalSignUpdate, current_user: User):
    record = db.get(VitalSignRecord, record_id)
    if not record:
        raise ValueError("Registro de sinais vitais não encontrado")

    assert_can_edit(record, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(record, field, val)

    record.updated_by_id = current_user.id
    db.commit()
    db.refresh(record)
    return record


def list_patient_vitals(db: Session, patient_id: int, target_date: date):
    if not db.get(Patient, patient_id):
        raise ValueError("Paciente não encontrado")
    from app.utils.time_windows import get_clinical_shift_window
    start, end = get_clinical_shift_window(target_date)
    return db.scalars(
        select(VitalSignRecord)
        .where(
            VitalSignRecord.patient_id == patient_id,
            VitalSignRecord.occurred_at >= start,
            VitalSignRecord.occurred_at < end,
        )
        .order_by(VitalSignRecord.occurred_at.asc(), VitalSignRecord.id.asc())
    ).all()

import pytest
from datetime import datetime
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.models import User, UserRole
from app.security import get_current_user, require_roles

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    db = TestingSessionLocal()
    user = db.get(User, 1)
    db.close()
    return user


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[require_roles(UserRole.ADMIN)] = override_get_current_user
app.dependency_overrides[require_roles(UserRole.ADMIN, UserRole.DEVELOPER)] = override_get_current_user

# ---------------------------------------------------------------------------
# Bypass the 24-hour backdate/future window validator for the entire test
# session.
#
# Existing tests use hardcoded timestamps from 2026-08-03 to 2026-08-06 as
# well as real-time relative helpers (_yesterday_shift_time, _today_shift_time
# in test_shift_lock.py that resolve to real "today" / "yesterday" dates).
# There is no single frozen "now" that makes both families simultaneously valid.
#
# The validator's correctness is covered by dedicated tests in
# test_backdate_validation.py. All other tests only need creation to succeed so
# that they can test the features they were written for.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True, scope="session")
def bypass_backdate_validator():
    """Patch assert_can_create_at to a no-op for the test session."""
    with patch("app.services.record_permissions.assert_can_create_at", return_value=None):
        yield


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    admin_user = User(
        id=1,
        username="admin",
        full_name="Admin Test",
        email="admin@hospital.com",
        password_hash="fakehash",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)

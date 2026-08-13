from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import PatientCreate, PatientPublic, PatientUpdate
from app.security import get_current_user, require_roles
from app.services import patients as patient_service

router = APIRouter(prefix="/patients", tags=["Pacientes"])


@router.get("", response_model=list[PatientPublic])
def list_patients(
    uti: str | None = None,
    bed: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return patient_service.list_patients(db=db, uti=uti, bed=bed)


@router.post("", response_model=PatientPublic, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.CLINICAL, UserRole.DEVELOPER)),
):
    return patient_service.create_patient(db=db, payload=payload)


@router.patch("/{patient_id}", response_model=PatientPublic)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.CLINICAL, UserRole.DEVELOPER)),
):
    return patient_service.update_patient(db=db, patient_id=patient_id, payload=payload)


@router.patch("/{patient_id}/archive", response_model=PatientPublic)
def archive_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.CLINICAL, UserRole.DEVELOPER)),
):
    return patient_service.archive_patient(db=db, patient_id=patient_id)


@router.delete("/{patient_id}", response_model=PatientPublic)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DEVELOPER)),
):
    # Depending on requirements, delete might be hard delete or soft delete
    # The previous code routed delete_patient to archive_patient
    return patient_service.archive_patient(db=db, patient_id=patient_id)

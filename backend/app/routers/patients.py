from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, User, UserRole
from app.schemas import PatientCreate, PatientPublic, PatientUpdate
from app.security import get_current_user, require_roles

router = APIRouter(prefix="/patients", tags=["Pacientes"])


@router.get("", response_model=list[PatientPublic])
def list_patients(
    uti: str | None = None,
    bed: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Patient).where(Patient.is_admitted.is_(True), Patient.is_active.is_(True))
    if uti:
        stmt = stmt.where(Patient.uti == uti.strip())
    if bed:
        stmt = stmt.where(Patient.bed == bed.strip())
    stmt = stmt.order_by(Patient.uti, Patient.bed, Patient.full_name)
    return db.scalars(stmt).all()


@router.post("", response_model=PatientPublic, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.ADMIN))):
    if db.scalar(select(Patient).where(Patient.medical_record == payload.medical_record)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Prontuário já cadastrado")
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.patch("/{patient_id}", response_model=PatientPublic)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    patient = db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


@router.patch("/{patient_id}/archive", response_model=PatientPublic)
def archive_patient(patient_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.ADMIN))):
    patient = db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    patient.is_active = False
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", response_model=PatientPublic)
def delete_patient(patient_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.ADMIN))):
    return archive_patient(patient_id=patient_id, db=db, _=user)

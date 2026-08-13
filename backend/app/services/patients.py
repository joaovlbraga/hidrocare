from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Patient
from app.schemas import PatientCreate, PatientUpdate


def list_patients(db: Session, uti: str | None = None, bed: str | None = None):
    stmt = select(Patient).where(Patient.is_admitted.is_(True), Patient.is_active.is_(True))
    if uti:
        stmt = stmt.where(Patient.uti == uti.strip())
    if bed:
        stmt = stmt.where(Patient.bed == bed.strip())
    stmt = stmt.order_by(Patient.uti, Patient.bed, Patient.full_name)
    return db.scalars(stmt).all()


def check_bed_occupancy(db: Session, uti: str, bed: str, exclude_patient_id: int | None = None):
    stmt = select(Patient).where(
        Patient.uti == uti,
        Patient.bed == bed,
        Patient.is_admitted.is_(True),
        Patient.is_active.is_(True)
    )
    if exclude_patient_id:
        stmt = stmt.where(Patient.id != exclude_patient_id)
        
    occupied = db.scalar(stmt)
    if occupied:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um paciente internado neste leito."
        )


def create_patient(db: Session, payload: PatientCreate):
    if db.scalar(select(Patient).where(Patient.medical_record == payload.medical_record)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Prontuário já cadastrado")
        
    check_bed_occupancy(db, payload.uti, payload.bed)
    
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: int, payload: PatientUpdate):
    patient = db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    
    new_uti = update_data.get("uti", patient.uti)
    new_bed = update_data.get("bed", patient.bed)
    
    # Check occupancy only if uti or bed are being updated
    if "uti" in update_data or "bed" in update_data:
        check_bed_occupancy(db, new_uti, new_bed, exclude_patient_id=patient.id)

    for field, value in update_data.items():
        if value is not None:
            setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


def archive_patient(db: Session, patient_id: int):
    patient = db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    patient.is_active = False
    db.commit()
    db.refresh(patient)
    return patient

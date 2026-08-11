from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, User, VitalSignRecord
from app.schemas import VitalSignCreate, VitalSignPublic, VitalSignUpdate
from app.security import assert_can_mutate_record, assert_owns_record, get_current_user
from app.utils.time_windows import get_clinical_shift_window

router = APIRouter(prefix="/vitals", tags=["Sinais Vitais"])


@router.post("/records", response_model=VitalSignPublic, status_code=status.HTTP_201_CREATED)
def create_or_upsert_vitals(payload: VitalSignCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.get(Patient, payload.patient_id):
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    # Check for existing record for the same patient and time slot
    existing = db.scalar(
        select(VitalSignRecord).where(
            VitalSignRecord.patient_id == payload.patient_id,
            VitalSignRecord.occurred_at == payload.occurred_at,
        )
    )

    if existing:
        # This is a functional edit — enforce shift-lock for CLINICAL users.
        assert_can_mutate_record(existing.occurred_at, current_user)
        assert_owns_record(existing.registered_by_id, current_user)
        # Perform upsert update if record already exists for this hour
        update_data = payload.model_dump(exclude_unset=True, exclude={"patient_id", "occurred_at"})
        for field, val in update_data.items():
            setattr(existing, field, val)
        existing.updated_by_id = current_user.id
        db.commit()
        db.refresh(existing)
        return existing

    record = VitalSignRecord(**payload.model_dump(), registered_by_id=current_user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/records/{record_id}", response_model=VitalSignPublic)
def update_vitals(record_id: int, payload: VitalSignUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.get(VitalSignRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Registro de sinais vitais não encontrado")

    assert_can_mutate_record(record.occurred_at, current_user)
    assert_owns_record(record.registered_by_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(record, field, val)

    record.updated_by_id = current_user.id
    db.commit()
    db.refresh(record)
    return record


@router.get("/patients/{patient_id}/records", response_model=list[VitalSignPublic])
def list_patient_vitals(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.get(Patient, patient_id):
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

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


from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import VitalSignCreate, VitalSignPublic, VitalSignUpdate
from app.security import get_current_user
from app.services.vital_records import create_or_upsert_vital, list_patient_vitals, update_vital
from app.models import User

router = APIRouter(prefix="/vitals", tags=["Sinais Vitais"])


@router.post("/records", response_model=VitalSignPublic, status_code=status.HTTP_201_CREATED)
def create_or_upsert_vitals(payload: VitalSignCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return create_or_upsert_vital(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/records/{record_id}", response_model=VitalSignPublic)
def update_vitals(record_id: int, payload: VitalSignUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return update_vital(db, record_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/patients/{patient_id}/records", response_model=list[VitalSignPublic])
def list_patient_vitals_route(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    try:
        return list_patient_vitals(db, patient_id, target_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

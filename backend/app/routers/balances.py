from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DailyBalance, DailySpreadsheetData, FluidRecordCreate, FluidRecordPublic, FluidRecordUpdate
from app.services.fluid_records import (
    create_fluid_record,
    delete_fluid_record,
    get_daily_balance,
    list_patient_records,
    update_fluid_record,
)
from app.security import get_current_user
from app.models import User

router = APIRouter(prefix="/balances", tags=["Balanço hídrico"])


@router.post("/records", status_code=status.HTTP_201_CREATED)
def create_record(payload: FluidRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return create_fluid_record(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/patients/{patient_id}/records", response_model=DailySpreadsheetData)
def list_patient_records_route(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    try:
        return list_patient_records(db, patient_id, target_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/records/{record_id}")
def update_record(record_id: int, payload: FluidRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return update_fluid_record(db, record_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        delete_fluid_record(db, record_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return None


@router.get("/patients/{patient_id}/daily", response_model=DailyBalance)
def daily_balance(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    try:
        return get_daily_balance(db, patient_id, target_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

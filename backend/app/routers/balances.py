from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FluidDirection, FluidRecord, Patient, User, VitalSignRecord
from app.schemas import DailyBalance, DailySpreadsheetData, FluidRecordCreate, FluidRecordPublic, FluidRecordUpdate
from app.security import get_current_user
from app.utils.time_windows import get_clinical_shift_window

router = APIRouter(prefix="/balances", tags=["Balanço hídrico"])


@router.post("/records", status_code=status.HTTP_201_CREATED)
def create_record(payload: FluidRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.get(Patient, payload.patient_id):
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    raw_vol = payload.volume_ml
    vol_num: float | None = None
    qual_str: str | None = None

    if isinstance(raw_vol, (int, float)):
        vol_num = float(raw_vol)
    elif isinstance(raw_vol, str):
        try:
            vol_num = float(raw_vol.strip())
        except ValueError:
            qual_str = raw_vol.strip()

    record = FluidRecord(
        patient_id=payload.patient_id,
        registered_by_id=current_user.id,
        direction=payload.direction,
        category=payload.category,
        volume_ml=vol_num,
        qualitative_value=qual_str,
        occurred_at=payload.occurred_at,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.get("/patients/{patient_id}/records", response_model=DailySpreadsheetData)
def list_patient_records(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.get(Patient, patient_id):
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    start, end = get_clinical_shift_window(target_date)
    fluids = db.scalars(
        select(FluidRecord)
        .where(FluidRecord.patient_id == patient_id, FluidRecord.occurred_at.between(start, end))
        .order_by(FluidRecord.occurred_at.asc(), FluidRecord.id.asc())
    ).all()
    vitals = db.scalars(
        select(VitalSignRecord)
        .where(VitalSignRecord.patient_id == patient_id, VitalSignRecord.occurred_at.between(start, end))
        .order_by(VitalSignRecord.occurred_at.asc(), VitalSignRecord.id.asc())
    ).all()
    return DailySpreadsheetData(fluids=fluids, vitals=vitals)


@router.patch("/records/{record_id}")
def update_record(record_id: int, payload: FluidRecordUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    record = db.get(FluidRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Registro não encontrado")

    if payload.volume_ml is None or str(payload.volume_ml).strip() in ("", "0"):
        db.delete(record)
        db.commit()
        return {"detail": "Registro removido", "deleted": True}

    raw_vol = payload.volume_ml
    if isinstance(raw_vol, (int, float)):
        record.volume_ml = float(raw_vol)
        record.qualitative_value = None
    elif isinstance(raw_vol, str):
        try:
            record.volume_ml = float(raw_vol.strip())
            record.qualitative_value = None
        except ValueError:
            record.volume_ml = None
            record.qualitative_value = raw_vol.strip()

    if payload.notes is not None:
        record.notes = payload.notes
    db.commit()
    db.refresh(record)
    vol_out = record.volume_ml
    if isinstance(vol_out, float) and vol_out.is_integer():
        vol_out = int(vol_out)

    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "direction": record.direction,
        "category": record.category,
        "volume_ml": vol_out if vol_out is not None else record.qualitative_value,
        "qualitative_value": record.qualitative_value,
        "occurred_at": record.occurred_at,
        "notes": record.notes,
    }


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    record = db.get(FluidRecord, record_id)
    if record:
        db.delete(record)
        db.commit()
    return None


@router.get("/patients/{patient_id}/daily", response_model=DailyBalance)
def daily_balance(patient_id: int, target_date: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    start, end = get_clinical_shift_window(target_date)
    totals = db.execute(
        select(
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.INPUT, FluidRecord.volume_ml), else_=0)), 0),
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.OUTPUT, FluidRecord.volume_ml), else_=0)), 0),
        ).where(FluidRecord.patient_id == patient_id, FluidRecord.occurred_at.between(start, end))
    ).one()

    cum_totals = db.execute(
        select(
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.INPUT, FluidRecord.volume_ml), else_=0)), 0),
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.OUTPUT, FluidRecord.volume_ml), else_=0)), 0),
        ).where(FluidRecord.patient_id == patient_id, FluidRecord.occurred_at < end)
    ).one()

    input_ml = int(totals[0])
    output_ml = int(totals[1])
    balance_ml = input_ml - output_ml
    cumulative_balance = float(cum_totals[0] - cum_totals[1])
    status_str = "POSITIVO" if balance_ml > 0 else "NEGATIVO" if balance_ml < 0 else "ZERADO"
    return DailyBalance(
        patient_id=patient_id,
        date=target_date,
        input_ml=input_ml,
        output_ml=output_ml,
        balance_ml=balance_ml,
        cumulative_balance=cumulative_balance,
        status=status_str,
    )

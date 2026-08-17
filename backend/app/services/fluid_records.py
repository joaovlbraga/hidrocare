from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import FluidDirection, FluidRecord, FluidType, Patient, User, VitalSignRecord
from app.schemas import FluidRecordCreate, FluidRecordUpdate
from app.services.record_permissions import assert_can_create_at, assert_can_edit
from app.utils.time_windows import get_clinical_shift_window

SINGLE_VALUE_CATEGORIES = {
    FluidType.IV_HYDRATION,
    FluidType.URINE,
    FluidType.SNE_SNG,
}


def parse_volume(raw_vol):
    vol_num = None
    qual_str = None
    if raw_vol is not None:
        if isinstance(raw_vol, (int, float)):
            vol_num = float(raw_vol)
        elif isinstance(raw_vol, str):
            try:
                vol_num = float(raw_vol.strip())
            except ValueError:
                qual_str = raw_vol.strip()
    return vol_num, qual_str


def create_fluid_record(db: Session, payload: FluidRecordCreate, current_user: User):
    if not db.get(Patient, payload.patient_id):
        raise ValueError("Paciente não encontrado")

    vol_num, qual_str = parse_volume(payload.volume_ml)

    if payload.category in SINGLE_VALUE_CATEGORIES:
        existing = db.scalars(
            select(FluidRecord).where(
                FluidRecord.patient_id == payload.patient_id,
                FluidRecord.occurred_at == payload.occurred_at,
                FluidRecord.category == payload.category,
            )
        ).first()

        if existing:
            assert_can_edit(existing, current_user)
            existing.volume_ml = vol_num
            existing.qualitative_value = qual_str
            if payload.notes is not None:
                existing.notes = payload.notes
            existing.registered_by_id = current_user.id
            existing.updated_by_id = current_user.id
            db.commit()
            db.refresh(existing)
            return {"id": existing.id}

    assert_can_create_at(payload.occurred_at, current_user)

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


def update_fluid_record(db: Session, record_id: int, payload: FluidRecordUpdate, current_user: User):
    record = db.get(FluidRecord, record_id)
    if not record:
        raise ValueError("Registro não encontrado")

    assert_can_edit(record, current_user)

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

    record.updated_by_id = current_user.id
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


def delete_fluid_record(db: Session, record_id: int, current_user: User):
    record = db.get(FluidRecord, record_id)
    if record:
        assert_can_edit(record, current_user)
        db.delete(record)
        db.commit()
    return None


def list_patient_records(db: Session, patient_id: int, target_date: date):
    if not db.get(Patient, patient_id):
        raise ValueError("Paciente não encontrado")
    start, end = get_clinical_shift_window(target_date)
    fluids = db.scalars(
        select(FluidRecord)
        .where(
            FluidRecord.patient_id == patient_id,
            FluidRecord.occurred_at >= start,
            FluidRecord.occurred_at < end,
        )
        .options(selectinload(FluidRecord.registered_by))
        .order_by(FluidRecord.occurred_at.asc(), FluidRecord.id.asc())
    ).all()
    vitals = db.scalars(
        select(VitalSignRecord)
        .where(
            VitalSignRecord.patient_id == patient_id,
            VitalSignRecord.occurred_at >= start,
            VitalSignRecord.occurred_at < end,
        )
        .order_by(VitalSignRecord.occurred_at.asc(), VitalSignRecord.id.asc())
    ).all()
    from app.schemas import DailySpreadsheetData
    return DailySpreadsheetData(fluids=fluids, vitals=vitals)


def get_daily_balance(db: Session, patient_id: int, target_date: date):
    from app.schemas import DailyBalance
    if not db.get(Patient, patient_id):
        raise ValueError("Paciente não encontrado")
    start, end = get_clinical_shift_window(target_date)
    totals = db.execute(
        select(
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.INPUT, FluidRecord.volume_ml), else_=0)), 0),
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.OUTPUT, FluidRecord.volume_ml), else_=0)), 0),
        )
        .where(
            FluidRecord.patient_id == patient_id,
            FluidRecord.occurred_at >= start,
            FluidRecord.occurred_at < end,
        )
    ).one()

    cum_totals = db.execute(
        select(
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.INPUT, FluidRecord.volume_ml), else_=0)), 0),
            func.coalesce(func.sum(case((FluidRecord.direction == FluidDirection.OUTPUT, FluidRecord.volume_ml), else_=0)), 0),
        ).where(FluidRecord.patient_id == patient_id, FluidRecord.occurred_at < end)
    ).one()

    qualitative_records = db.scalars(
        select(FluidRecord)
        .where(
            FluidRecord.patient_id == patient_id,
            FluidRecord.occurred_at >= start,
            FluidRecord.occurred_at < end,
            FluidRecord.qualitative_value.isnot(None),
        )
        .options(selectinload(FluidRecord.registered_by))
        .order_by(FluidRecord.occurred_at.asc(), FluidRecord.id.asc())
    ).all()

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
        qualitative_records=qualitative_records,
    )

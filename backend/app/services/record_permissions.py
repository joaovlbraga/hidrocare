from fastapi import HTTPException
from app.models import UserRole
from app.security import assert_can_mutate_record

from datetime import datetime, timedelta
import logging

audit_logger = logging.getLogger("audit")

def assert_can_create_at(occurred_at: datetime, current_user) -> None:
    now = datetime.now()
    if occurred_at.tzinfo is not None:
        occurred_at = occurred_at.replace(tzinfo=None)

    is_within_24h = (now - timedelta(hours=24)) <= occurred_at <= (now + timedelta(hours=24))

    if not is_within_24h:
        if current_user.role in {UserRole.ADMIN, UserRole.DEVELOPER}:
            audit_logger.info(f"AUDIT: Privileged role {current_user.role} (User ID {current_user.id}) bypassed 24h creation window for timestamp {occurred_at}")
            return
        
        if occurred_at > now + timedelta(hours=24):
            raise HTTPException(
                status_code=422,
                detail="O horário do registro não pode ser mais de 24 horas no futuro. Verifique a data e hora informadas."
            )
        else:
            raise HTTPException(
                status_code=422,
                detail="Não é possível registrar eventos com mais de 24 horas de antecedência. Verifique a data e hora do lançamento."
            )

def assert_can_edit(record, current_user) -> None:
    now = datetime.now()
    record_time = record.occurred_at
    if record_time.tzinfo is not None:
        record_time = record_time.replace(tzinfo=None)

    is_within_24h = (now - timedelta(hours=24)) <= record_time <= (now + timedelta(hours=24))
    
    if not is_within_24h:
        if current_user.role in {UserRole.ADMIN, UserRole.DEVELOPER}:
            audit_logger.info(f"AUDIT: Privileged role {current_user.role} (User ID {current_user.id}) bypassed 24h edit window for record ID {record.id} at {record_time}")
            return
        assert_can_mutate_record(record.occurred_at, current_user)
    
    if current_user.role not in {UserRole.ADMIN, UserRole.DEVELOPER}:
        if record.registered_by_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Você só tem permissão para editar ou remover os registros lançados pelo seu próprio usuário.",
            )

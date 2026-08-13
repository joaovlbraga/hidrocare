from fastapi import HTTPException
from app.models import UserRole
from app.security import assert_can_mutate_record


def assert_can_edit(record, current_user) -> None:
    assert_can_mutate_record(record.occurred_at, current_user)
    
    if current_user.role != UserRole.ADMIN:
        if record.registered_by_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Você só tem permissão para editar ou remover os registros lançados pelo seu próprio usuário.",
            )

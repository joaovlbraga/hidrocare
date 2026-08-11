from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import LoginRequest, PasswordResetRequest, Token, UserCreate, UserPublic
from app.security import create_access_token, get_current_user, hash_password, require_roles, verify_password

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username.lower()))
    if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos")
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DEVELOPER))):
    """Somente administradores podem provisionar acessos ao prontuário."""
    if current_user.role == UserRole.ADMIN and payload.role in [UserRole.ADMIN, UserRole.DEVELOPER]:
        raise HTTPException(status_code=403, detail="Administradores só têm permissão para cadastrar usuários do perfil Assistencial (Enfermeiros).")
    
    if db.scalar(select(User).where(User.username == payload.username.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um usuário com este nome de usuário")
    if payload.email and db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um usuário com este e-mail")
    email_val = payload.email.lower() if payload.email else None
    user = User(username=payload.username.lower(), full_name=payload.full_name, email=email_val, phone=payload.phone, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserPublic])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DEVELOPER))):
    stmt = select(User).order_by(User.username)
    if current_user.role == UserRole.ADMIN:
        stmt = stmt.where(User.role == UserRole.CLINICAL)
    return db.scalars(stmt).all()


@router.patch("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: int,
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DEVELOPER)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        
    if current_user.role == UserRole.ADMIN and user.role != UserRole.CLINICAL:
        raise HTTPException(status_code=403, detail="Administradores só podem alterar senhas de usuários do perfil Assistencial (Enfermeiros).")
        
    user.password_hash = hash_password(payload.new_password)
    db.commit()

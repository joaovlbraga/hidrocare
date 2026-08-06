"""Cria o primeiro administrador local sem expor a senha no código ou no banco."""

from getpass import getpass

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import User, UserRole
from app.security import hash_password


def main() -> None:
    Base.metadata.create_all(bind=engine)
    full_name = input("Nome completo do administrador: ").strip()
    email = input("E-mail do administrador: ").strip().lower()
    password = getpass("Senha (mínimo de 8 caracteres): ")
    password_confirmation = getpass("Confirme a senha: ")

    if not full_name or "@" not in email:
        raise SystemExit("Informe um nome e um e-mail válidos.")
    if len(password) < 8:
        raise SystemExit("A senha deve possuir ao menos 8 caracteres.")
    if password != password_confirmation:
        raise SystemExit("As senhas não coincidem.")

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            raise SystemExit("Já existe um usuário com este e-mail.")
        db.add(User(full_name=full_name, email=email, password_hash=hash_password(password), role=UserRole.ADMIN))
        db.commit()
    print(f"Administrador {email} criado com sucesso.")


if __name__ == "__main__":
    main()

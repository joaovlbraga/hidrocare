from fastapi.testclient import TestClient
from unittest.mock import patch

def test_login_wrong_password(client: TestClient):
    with patch("app.routers.auth.verify_password", return_value=False):
        response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Usuário ou senha inválidos"

def test_login_unknown_username(client: TestClient):
    response = client.post("/api/v1/auth/login", json={"username": "unknown", "password": "password123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha inválidos"

def test_create_user_duplicate_username(client: TestClient):
    response = client.post("/api/v1/auth/users", json={
        "username": "admin",
        "full_name": "Another Admin",
        "email": "another@hospital.com",
        "password": "password123",
        "role": "CLINICAL"
    })
    assert response.status_code == 409
    assert response.json()["detail"] == "Já existe um usuário com este nome de usuário"

def test_create_user_success(client: TestClient):
    response = client.post("/api/v1/auth/users", json={
        "username": "newuser",
        "full_name": "New User",
        "email": "newuser@hospital.com",
        "password": "password123",
        "role": "CLINICAL"
    })
    assert response.status_code == 201
    assert response.json()["username"] == "newuser"

def test_create_user_no_email_with_phone(client: TestClient):
    response = client.post("/api/v1/auth/users", json={
        "username": "phoneuser",
        "full_name": "Phone User",
        "email": None,
        "phone": "(11) 99999-9999",
        "password": "password123",
        "role": "CLINICAL"
    })
    assert response.status_code == 201
    assert response.json()["username"] == "phoneuser"
    assert response.json()["phone"] == "(11) 99999-9999"
    assert response.json()["email"] is None

def test_admin_cannot_create_admin(client: TestClient):
    response = client.post("/api/v1/auth/users", json={
        "username": "admin2",
        "full_name": "Admin 2",
        "email": "admin2@hospital.com",
        "password": "password123",
        "role": "ADMIN"
    })
    assert response.status_code == 403
    assert "Administradores só têm permissão" in response.json()["detail"]

def test_admin_list_only_clinical(client: TestClient):
    response = client.get("/api/v1/auth/users")
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 0 # no clinical users initially created in fixture

def test_developer_can_create_admin(client: TestClient):
    from app.main import app
    from app.security import get_current_user
    from app.models import User, UserRole
    
    def override_developer():
        return User(id=99, username="dev", role=UserRole.DEVELOPER, is_active=True)
        
    
    old_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_current_user] = override_developer
    for dep in list(app.dependency_overrides.keys()):
        if getattr(dep, "__name__", "") == "RoleChecker":
            app.dependency_overrides[dep] = override_developer
    
    response = client.post("/api/v1/auth/users", json={
        "username": "admin3",
        "full_name": "Admin 3",
        "email": "admin3@hospital.com",
        "password": "password123",
        "role": "ADMIN"
    })
    assert response.status_code == 201
    
    app.dependency_overrides = old_overrides


def test_update_own_password_success(client: TestClient):
    from app.main import app
    from app.security import get_current_user
    from app.models import User, UserRole
    
    # We must remove the conftest.py override of get_current_user
    # so that the real token-based lookup occurs, and the user is attached to the DB session.
    old_overrides = app.dependency_overrides.copy()
    
    def override_developer():
        return User(id=99, username="dev", role=UserRole.DEVELOPER, is_active=True)
    
    app.dependency_overrides[get_current_user] = override_developer
    for dep in list(app.dependency_overrides.keys()):
        if getattr(dep, "__name__", "") == "RoleChecker":
            app.dependency_overrides[dep] = override_developer

    client.post("/api/v1/auth/users", json={
        "username": "tester1",
        "full_name": "Tester",
        "password": "password123",
        "role": "CLINICAL"
    })
    
    # Now remove the override completely to use real token logic
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    login = client.post("/api/v1/auth/login", json={"username": "tester1", "password": "password123"})
    token = login.json()["access_token"]
    
    response = client.patch(
        "/api/v1/auth/me/password", 
        json={"current_password": "password123", "new_password": "newpassword123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204
    
    login2 = client.post("/api/v1/auth/login", json={"username": "tester1", "password": "password123"})
    assert login2.status_code == 401
    
    login3 = client.post("/api/v1/auth/login", json={"username": "tester1", "password": "newpassword123"})
    assert login3.status_code == 200

    app.dependency_overrides = old_overrides


def test_update_own_password_wrong_current(client: TestClient):
    from app.main import app
    from app.security import get_current_user
    from app.models import User, UserRole
    
    old_overrides = app.dependency_overrides.copy()
    
    def override_developer():
        return User(id=99, username="dev", role=UserRole.DEVELOPER, is_active=True)
    
    app.dependency_overrides[get_current_user] = override_developer
    for dep in list(app.dependency_overrides.keys()):
        if getattr(dep, "__name__", "") == "RoleChecker":
            app.dependency_overrides[dep] = override_developer

    client.post("/api/v1/auth/users", json={
        "username": "tester2",
        "full_name": "Tester",
        "password": "password123",
        "role": "CLINICAL"
    })
    
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    login = client.post("/api/v1/auth/login", json={"username": "tester2", "password": "password123"})
    token = login.json()["access_token"]
    
    response = client.patch(
        "/api/v1/auth/me/password", 
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    
    login2 = client.post("/api/v1/auth/login", json={"username": "tester2", "password": "password123"})
    assert login2.status_code == 200

    app.dependency_overrides = old_overrides


def test_update_own_password_too_short(client: TestClient):
    from app.main import app
    from app.security import get_current_user
    from app.models import User, UserRole
    
    old_overrides = app.dependency_overrides.copy()
    
    def override_developer():
        return User(id=99, username="dev", role=UserRole.DEVELOPER, is_active=True)
    
    app.dependency_overrides[get_current_user] = override_developer
    for dep in list(app.dependency_overrides.keys()):
        if getattr(dep, "__name__", "") == "RoleChecker":
            app.dependency_overrides[dep] = override_developer

    client.post("/api/v1/auth/users", json={
        "username": "tester3",
        "full_name": "Tester",
        "password": "password123",
        "role": "CLINICAL"
    })
    
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    login = client.post("/api/v1/auth/login", json={"username": "tester3", "password": "password123"})
    token = login.json()["access_token"]
    
    response = client.patch(
        "/api/v1/auth/me/password", 
        json={"current_password": "password123", "new_password": "short"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422
    
    app.dependency_overrides = old_overrides


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
        "role": "ADMIN"
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

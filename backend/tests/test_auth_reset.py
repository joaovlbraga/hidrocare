import pytest
from app.models import User, UserRole
from app.security import hash_password

def test_list_users_requires_admin_or_dev(client, monkeypatch):
    response = client.get("/api/v1/auth/users")
    assert response.status_code == 200
    assert type(response.json()) == list

    # Test clinical cannot list users
    from app.main import app
    from app.security import require_roles, get_current_user
    
    # Temporarily remove all overrides that bypass require_roles
    old_overrides = app.dependency_overrides.copy()
    
    # We clear the specific overrides for require_roles
    # We can just override get_current_user to return a CLINICAL user
    # But wait, because the route depends on require_roles(...), overriding get_current_user DOES work 
    # IF we don't override require_roles(...) directly.
    # Let's clear all overrides and just set get_db and get_current_user
    from app.database import get_db
    
    def override_get_clinical_user():
        from app.models import User, UserRole
        return User(
            id=99,
            username="clinicaltest",
            full_name="Clinical Test",
            email="clinical@hospital.com",
            password_hash="fake",
            role=UserRole.CLINICAL,
            is_active=True
        )
        
    app.dependency_overrides = {
        get_db: old_overrides.get(get_db),
        get_current_user: override_get_clinical_user
    }
    
    response = client.get("/api/v1/auth/users")
    assert response.status_code == 403
    
    app.dependency_overrides = old_overrides

def test_reset_password_success(client):
    from app.main import app
    from app.security import require_roles
    
    # We must ensure there's a second user to reset
    from app.database import get_db
    db_gen = app.dependency_overrides[get_db]()
    db = next(db_gen)
    target_user = User(
        username="target",
        full_name="Target User",
        email="target@hospital.com",
        password_hash=hash_password("oldpassword"),
        role=UserRole.CLINICAL,
    )
    db.add(target_user)
    db.commit()
    target_id = target_user.id
    db.close()
    
    # ensure admin override is back
    pass

    
    response = client.patch(f"/api/v1/auth/users/{target_id}/password", json={"new_password": "newpassword123"})
    assert response.status_code == 204
    
    # verify old password fails
    response_old = client.post("/api/v1/auth/login", json={"username": "target", "password": "oldpassword"})
    assert response_old.status_code == 401
    
    # verify new password works
    response_new = client.post("/api/v1/auth/login", json={"username": "target", "password": "newpassword123"})
    assert response_new.status_code == 200
    assert "access_token" in response_new.json()

def test_reset_password_unknown_user(client):
    response = client.patch("/api/v1/auth/users/9999/password", json={"new_password": "newpassword123"})
    assert response.status_code == 404

def test_reset_password_too_short(client):
    response = client.patch("/api/v1/auth/users/1/password", json={"new_password": "short"})
    assert response.status_code == 422

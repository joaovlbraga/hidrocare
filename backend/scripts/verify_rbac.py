from fastapi.testclient import TestClient
import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.main import app
from app.models import User
from app.security import hash_password
from app.database import SessionLocal

def test_rbac():
    db = SessionLocal()
    
    # ensure users exist
    for role in ["ADMIN", "DEVELOPER", "CLINICAL"]:
        email = f"{role.lower()}@test.com"
        user = db.query(User).filter_by(email=email).first()
        if not user:
            user = User(full_name=f"Test {role}", email=email, password_hash=hash_password("password"), role=role, is_active=True)
            db.add(user)
    
    db.commit()
    db.close()

    client = TestClient(app)
    results = {}

    # Test CLINICAL
    res = client.post("/api/v1/auth/login", json={"email": "clinical@test.com", "password": "password"})
    if res.status_code != 200:
        print("CLINICAL login failed", res.text)
        return
    clinical_token = res.json()["access_token"]
    
    res = client.post("/api/v1/auth/users", json={
        "full_name": "Test User 1",
        "email": "test1@test.com",
        "password": "password123",
        "role": "CLINICAL"
    }, headers={"Authorization": f"Bearer {clinical_token}"})
    results["CLINICAL"] = res.status_code

    # Test DEVELOPER
    res = client.post("/api/v1/auth/login", json={"email": "developer@test.com", "password": "password"})
    dev_token = res.json()["access_token"]
    
    res = client.post("/api/v1/auth/users", json={
        "full_name": "Test User 2",
        "email": "test2@test.com",
        "password": "password123",
        "role": "CLINICAL"
    }, headers={"Authorization": f"Bearer {dev_token}"})
    results["DEVELOPER"] = res.status_code

    # Test ADMIN
    res = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "password"})
    admin_token = res.json()["access_token"]
    
    res = client.post("/api/v1/auth/users", json={
        "full_name": "Test User 3",
        "email": "test3@test.com",
        "password": "password123",
        "role": "CLINICAL"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    results["ADMIN"] = res.status_code

    print("RBAC Validation Results:")
    print(f"CLINICAL creating user: HTTP {results['CLINICAL']}")
    print(f"DEVELOPER creating user: HTTP {results['DEVELOPER']}")
    print(f"ADMIN creating user: HTTP {results['ADMIN']}")

test_rbac()

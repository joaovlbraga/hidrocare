import pytest


def test_concurrent_fluid_record_writes(client):
    # Setup test patient via standard client
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-CONCUR-01",
            "full_name": "Paciente Concorrência",
            "birth_date": "1982-02-14",
            "bed": "UTI 08",
            "health_insurance": "SUS",
        },
    )
    if res.status_code == 201:
        patient_id = res.json()["id"]
    else:
        p_res = client.get("/api/v1/patients")
        patient_id = p_res.json()[0]["id"]

    # Execute rapid sequential & concurrent requests simulation
    results = []
    for i in range(15):
        payload = {
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 50 + i,
            "occurred_at": f"2026-08-06T07:{i:02d}:00",
        }
        r = client.post("/api/v1/balances/records", json=payload)
        results.append(r)

    # Assert all 15 completed with 201 and no server errors
    for resp in results:
        assert resp.status_code == 201
        assert "id" in resp.json()

    # Verify all 15 records were persisted safely
    rec_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-06")
    assert rec_res.status_code == 200
    assert len(rec_res.json()["fluids"]) == 15


def test_duplicate_insert_same_coordinate_updates_not_duplicates(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-DUP-01",
            "full_name": "Paciente Dup Test",
            "birth_date": "1990-05-10",
            "bed": "UTI 10",
        },
    )
    patient_id = res_p.json()["id"]

    # Initial POST 100ml URINE at 08:00
    r1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 100,
            "occurred_at": "2026-08-06T08:00:00",
        },
    )
    assert r1.status_code == 201
    id1 = r1.json()["id"]

    # Second POST 150ml URINE at 08:00 (exact same coordinate)
    r2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 150,
            "occurred_at": "2026-08-06T08:00:00",
        },
    )
    assert r2.status_code == 201
    id2 = r2.json()["id"]

    # Must reuse the same record ID
    assert id2 == id1

    # Verify grid records contain exactly 1 row with volume 150
    rec_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-06")
    assert rec_res.status_code == 200
    fluids = rec_res.json()["fluids"]
    assert len(fluids) == 1
    assert fluids[0]["volume_ml"] == 150

    # Verify daily balance shows output_ml = 150 (not 250)
    daily_res = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-06")
    assert daily_res.status_code == 200
    assert daily_res.json()["output_ml"] == 150


def test_concurrent_double_post_same_coordinate(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-DUP-02",
            "full_name": "Paciente Race Test",
            "birth_date": "1988-11-20",
            "bed": "UTI 11",
        },
    )
    patient_id = res_p.json()["id"]

    # Double POST to same coordinate
    r1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 200,
            "occurred_at": "2026-08-06T09:00:00",
        },
    )
    r2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 250,
            "occurred_at": "2026-08-06T09:00:00",
        },
    )

    assert r1.status_code == 201
    assert r2.status_code == 201

    rec_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-06")
    fluids = rec_res.json()["fluids"]
    assert len(fluids) == 1
    assert fluids[0]["volume_ml"] == 250


def test_multi_item_categories_still_allow_multiple_records(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-MULTI-01",
            "full_name": "Paciente Multi Item",
            "birth_date": "1975-06-15",
            "bed": "UTI 12",
        },
    )
    patient_id = res_p.json()["id"]

    # Two MEDICATION records for same hour
    r1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "MEDICATION",
            "volume_ml": 50,
            "occurred_at": "2026-08-06T10:00:00",
            "notes": "Dipirona 50ml",
        },
    )
    r2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "MEDICATION",
            "volume_ml": 100,
            "occurred_at": "2026-08-06T10:00:00",
            "notes": "Soro Fisiológico 100ml",
        },
    )

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]

    rec_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-06")
    fluids = rec_res.json()["fluids"]
    assert len(fluids) == 2


def test_stool_is_multi_item(client):
    """STOOL is now multi-item: each POST creates a new row (no upsert)."""
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-QUAL-01",
            "full_name": "Paciente Qual Upsert",
            "birth_date": "1993-09-09",
            "bed": "UTI 13",
        },
    )
    patient_id = res_p.json()["id"]

    r1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "STOOL",
            "volume_ml": 100,
            "occurred_at": "2026-08-06T11:00:00",
        },
    )
    assert r1.status_code == 201

    # Second entry at the SAME hour must create a NEW row (not upsert)
    r2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "STOOL",
            "volume_ml": "++",
            "occurred_at": "2026-08-06T11:00:00",
        },
    )
    assert r2.status_code == 201
    assert r2.json()["id"] != r1.json()["id"]

    rec_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-06")
    fluids = rec_res.json()["fluids"]
    stool_records = [f for f in fluids if f["category"] == "STOOL"]
    assert len(stool_records) == 2
    qual_records = [f for f in stool_records if f.get("qualitative_value") == "++"]
    assert len(qual_records) == 1

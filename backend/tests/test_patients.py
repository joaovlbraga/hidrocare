def test_create_list_and_archive_patient(client):
    response = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-001",
            "full_name": "Paciente Teste 1",
            "birth_date": "1980-05-15",
            "bed": "UTI 01",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["medical_record"] == "REC-001"
    assert data["health_insurance"] == "SUS"
    assert data["is_active"] is True
    patient_id = data["id"]

    response = client.get("/api/v1/patients")
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) == 1
    assert patients[0]["id"] == patient_id

    response = client.patch(f"/api/v1/patients/{patient_id}/archive")
    assert response.status_code == 200
    archived = response.json()
    assert archived["is_active"] is False

    response = client.get("/api/v1/patients")
    assert response.status_code == 200
    patients_after = response.json()
    assert len(patients_after) == 0


def test_post_record_fixed_hour(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-002",
            "full_name": "Paciente Teste 2",
            "birth_date": "1992-10-20",
            "bed": "UTI 02",
        },
    )
    patient_id = res_p.json()["id"]

    record_payload = {
        "patient_id": patient_id,
        "direction": "INPUT",
        "category": "ORAL_DIET",
        "volume_ml": 300,
        "occurred_at": "2026-08-05T07:00:00",
        "notes": "Dieta matinal 07:00",
    }
    response = client.post("/api/v1/balances/records", json=record_payload)
    assert response.status_code == 201
    assert "id" in response.json()


def test_grid_fetch_patch_and_delete(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-003",
            "full_name": "Paciente Teste 3",
            "birth_date": "1975-03-30",
            "bed": "UTI 03",
        },
    )
    patient_id = res_p.json()["id"]

    res_r = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 150,
            "occurred_at": "2026-08-05T08:00:00",
        },
    )
    record_id = res_r.json()["id"]

    res_list = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-05")
    assert res_list.status_code == 200
    aggregated = res_list.json()
    assert "fluids" in aggregated
    assert len(aggregated["fluids"]) == 1
    assert aggregated["fluids"][0]["id"] == record_id

    res_patch = client.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": 200})
    assert res_patch.status_code == 200
    assert str(res_patch.json()["volume_ml"]) == "200"

    res_clear = client.patch(f"/api/v1/balances/records/{record_id}", json={"volume_ml": None})
    assert res_clear.status_code == 200

    res_list_empty = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-05")
    assert res_list_empty.status_code == 200
    assert len(res_list_empty.json()["fluids"]) == 0


def test_qualitative_record_creation_and_daily_balance(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-004",
            "full_name": "Paciente Teste Qualitativo",
            "birth_date": "1988-04-12",
            "bed": "UTI 04",
        },
    )
    patient_id = res_p.json()["id"]

    # Post qualitative cross entry ++ for STOOL
    res_qual = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "STOOL",
            "volume_ml": "++",
            "occurred_at": "2026-08-05T10:00:00",
        },
    )
    assert res_qual.status_code == 201

    # Post numeric entry 500 for IV_HYDRATION
    res_num = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": "500",
            "occurred_at": "2026-08-05T10:00:00",
        },
    )
    assert res_num.status_code == 201

    # Fetch daily balance: ++ evaluates to 0, total input=500, output=0, balance=500
    res_daily = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-05")
    assert res_daily.status_code == 200
    daily_data = res_daily.json()
    assert daily_data["input_ml"] == 500
    assert daily_data["output_ml"] == 0
    assert daily_data["balance_ml"] == 500

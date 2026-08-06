def test_vital_signs_post_patch_and_aggregation(client):
    # 1. Create patient
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-VITALS-1",
            "full_name": "Paciente Vinais",
            "birth_date": "1985-04-12",
            "bed": "UTI 05",
        },
    )
    assert res_p.status_code == 201
    patient_id = res_p.json()["id"]

    # 2. POST vital sign entry
    vitals_payload = {
        "patient_id": patient_id,
        "occurred_at": "2026-08-05T07:00:00",
        "pulse": 82,
        "blood_pressure": "120/80",
        "temperature": 36.6,
        "respiration": 18,
        "spo2": 98,
        "hgt": 110,
    }
    res_v = client.post("/api/v1/vitals/records", json=vitals_payload)
    assert res_v.status_code == 201
    vitals_data = res_v.json()
    assert vitals_data["pulse"] == 82
    assert vitals_data["blood_pressure"] == "120/80"
    vital_id = vitals_data["id"]

    # 3. PATCH vital sign entry
    res_patch = client.patch(f"/api/v1/vitals/records/{vital_id}", json={"temperature": 37.2, "spo2": 99})
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["temperature"] == 37.2
    assert patched["spo2"] == 99
    assert patched["pulse"] == 82

    # 4. Aggregated GET /balances/patients/{id}/records
    res_agg = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-05")
    assert res_agg.status_code == 200
    aggregated = res_agg.json()
    assert "fluids" in aggregated
    assert "vitals" in aggregated
    assert len(aggregated["vitals"]) == 1
    assert aggregated["vitals"][0]["id"] == vital_id


def test_vital_signs_range_validation(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-VITALS-2",
            "full_name": "Paciente Vinais Invalid",
            "birth_date": "1990-01-01",
            "bed": "UTI 06",
        },
    )
    assert res_p.status_code == 201
    patient_id = res_p.json()["id"]

    # Invalid pulse (too high)
    res_invalid_pulse = client.post(
        "/api/v1/vitals/records",
        json={
            "patient_id": patient_id,
            "occurred_at": "2026-08-05T08:00:00",
            "pulse": 300,
        },
    )
    assert res_invalid_pulse.status_code == 422

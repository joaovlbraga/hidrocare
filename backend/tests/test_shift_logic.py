def create_patient_for_shift(client):
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-SHIFT-01",
            "full_name": "Paciente Turno UTI",
            "birth_date": "1991-03-25",
            "bed": "UTI 06",
            "health_insurance": "SUS",
        },
    )
    if res.status_code == 201:
        return res.json()["id"]
    p_res = client.get("/api/v1/patients")
    for p in p_res.json():
        if p["medical_record"] == "REC-SHIFT-01":
            return p["id"]
    return p_res.json()[0]["id"]


def test_clinical_shift_boundary_assignment(client):
    patient_id = create_patient_for_shift(client)
    target_date = "2026-08-06"

    # Insert records at boundary timestamps:
    # Shift for 2026-08-06 runs from 2026-08-06T07:00:00 to 2026-08-07T07:00:00 (06:59:59)
    timestamps_in_shift = [
        "2026-08-06T07:00:00",
        "2026-08-06T07:00:01",
        "2026-08-06T23:59:59",
        "2026-08-07T00:00:00",
        "2026-08-07T06:58:59",
        "2026-08-07T06:59:59",
    ]

    timestamps_outside_shift = [
        "2026-08-06T06:58:59",
        "2026-08-06T06:59:59",
        "2026-08-07T07:00:01",
    ]

    # Post in-shift records (100ml each = 600ml total)
    for ts in timestamps_in_shift:
        res = client.post(
            "/api/v1/balances/records",
            json={
                "patient_id": patient_id,
                "direction": "INPUT",
                "category": "IV_HYDRATION",
                "volume_ml": 100,
                "occurred_at": ts,
            },
        )
        assert res.status_code == 201

    # Post out-of-shift records (500ml each = 1500ml)
    for ts in timestamps_outside_shift:
        res = client.post(
            "/api/v1/balances/records",
            json={
                "patient_id": patient_id,
                "direction": "INPUT",
                "category": "IV_HYDRATION",
                "volume_ml": 500,
                "occurred_at": ts,
            },
        )
        assert res.status_code == 201

    # Fetch 2026-08-06 shift records
    records_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date={target_date}")
    assert records_res.status_code == 200
    fluids = records_res.json()["fluids"]
    assert len(fluids) == len(timestamps_in_shift)

    # Daily balance for 2026-08-06 shift should equal exactly 600ml
    balance_res = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date={target_date}")
    assert balance_res.status_code == 200
    daily_data = balance_res.json()
    assert daily_data["input_ml"] == 600

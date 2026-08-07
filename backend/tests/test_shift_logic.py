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


def test_shift_boundary_strict_exclusivity_0700(client):
    res_p = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-SHIFT-BOUNDARY",
            "full_name": "Paciente Boundary 0700",
            "birth_date": "1990-01-01",
            "uti": "UTI 1",
            "bed": "09",
        },
    )
    patient_id = res_p.json()["id"]

    # Record A: 2026-08-05 06:59:59 (last second of 04/08 shift)
    res_a = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 150,
            "occurred_at": "2026-08-05T06:59:59",
        },
    )
    assert res_a.status_code == 201
    rec_a_id = res_a.json()["id"]

    # Record B: 2026-08-05 07:00:00 (first second of 05/08 shift)
    res_b = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 250,
            "occurred_at": "2026-08-05T07:00:00",
        },
    )
    assert res_b.status_code == 201
    rec_b_id = res_b.json()["id"]

    # Fetch 04/08 shift records
    res_04 = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-04")
    assert res_04.status_code == 200
    fluids_04 = res_04.json()["fluids"]
    ids_04 = [f["id"] for f in fluids_04]

    # Record A must be included in 04/08 shift
    assert rec_a_id in ids_04
    # Record B must NOT be included in 04/08 shift
    assert rec_b_id not in ids_04

    # Fetch 05/08 shift records
    res_05 = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date=2026-08-05")
    assert res_05.status_code == 200
    fluids_05 = res_05.json()["fluids"]
    ids_05 = [f["id"] for f in fluids_05]

    # Record B MUST be included in 05/08 shift
    assert rec_b_id in ids_05
    # Record A must NOT be included in 05/08 shift
    assert rec_a_id not in ids_05


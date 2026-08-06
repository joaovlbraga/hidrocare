import math


def create_patient_for_edge(client):
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-EDGE-01",
            "full_name": "Paciente Balanço Especial",
            "birth_date": "1978-11-05",
            "bed": "UTI 07",
            "health_insurance": "Unimed",
        },
    )
    if res.status_code == 201:
        return res.json()["id"]
    p_res = client.get("/api/v1/patients")
    for p in p_res.json():
        if p["medical_record"] == "REC-EDGE-01":
            return p["id"]
    return p_res.json()[0]["id"]


def test_qualitative_zero_math_contribution(client):
    patient_id = create_patient_for_edge(client)
    target_date = "2026-08-06"

    # Post numerical inputs: 250ml IV_HYDRATION and 150ml MEDICATION (Total Input = 400)
    res_input1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 250,
            "occurred_at": "2026-08-06T08:00:00",
        },
    )
    assert res_input1.status_code == 201

    res_input2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "MEDICATION",
            "volume_ml": 150,
            "occurred_at": "2026-08-06T09:00:00",
        },
    )
    assert res_input2.status_code == 201

    # Post qualitative output: STOOL with "+++" and URINE with "++"
    res_qual1 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "STOOL",
            "volume_ml": "+++",
            "occurred_at": "2026-08-06T10:00:00",
        },
    )
    assert res_qual1.status_code == 201

    res_qual2 = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": "++",
            "occurred_at": "2026-08-06T11:00:00",
        },
    )
    assert res_qual2.status_code == 201

    # Fetch daily balance
    balance_res = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date={target_date}")
    assert balance_res.status_code == 200
    daily_data = balance_res.json()

    # Verify input_ml = 400, output_ml = 0, balance_ml = 400
    assert daily_data["input_ml"] == 400
    assert daily_data["output_ml"] == 0
    assert daily_data["balance_ml"] == 400
    assert daily_data["status"] == "POSITIVO"

    # Assert no NaN or Inf
    assert not math.isnan(daily_data["balance_ml"])
    assert not math.isinf(daily_data["balance_ml"])

    # Fetch list records to confirm qualitative string returned as entered
    list_res = client.get(f"/api/v1/balances/patients/{patient_id}/records?target_date={target_date}")
    assert list_res.status_code == 200
    fluids = list_res.json()["fluids"]

    qual_records = [f for f in fluids if f["category"] in ("STOOL", "URINE")]
    assert len(qual_records) == 2
    for qr in qual_records:
        assert qr["volume_ml"] in ("+++", "++")
        assert qr["qualitative_value"] in ("+++", "++")


def test_cumulative_fluid_balance_across_shifts(client):
    patient_id = create_patient_for_edge(client)

    # Shift 1 (2026-08-05): 500ml input, 100ml output -> 24h balance = +400ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 500,
            "occurred_at": "2026-08-05T08:00:00",
        },
    )
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 100,
            "occurred_at": "2026-08-05T12:00:00",
        },
    )

    # Shift 2 (2026-08-06): 200ml input, 300ml output -> 24h balance = -100ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 200,
            "occurred_at": "2026-08-06T08:00:00",
        },
    )
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 300,
            "occurred_at": "2026-08-06T12:00:00",
        },
    )

    # Daily balance for 2026-08-05 shift: 24h balance = 400, cumulative = 400
    b1 = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-05").json()
    assert b1["balance_ml"] == 400
    assert b1["cumulative_balance"] == 400.0

    # Daily balance for 2026-08-06 shift: 24h balance = -100, cumulative = 400 + (-100) = 300
    b2 = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-06").json()
    assert b2["balance_ml"] == -100
    assert b2["cumulative_balance"] == 300.0


def test_uat_multi_day_cumulative_balance_dataset(client):
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-UAT-CUM",
            "full_name": "Paciente Acumulado UAT",
            "birth_date": "1990-01-01",
            "bed": "UTI 10",
            "health_insurance": "SUS",
        },
    )
    patient_id = res.json()["id"] if res.status_code == 201 else client.get("/api/v1/patients").json()[0]["id"]

    # Day -3 (2026-08-03): +500ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 500,
            "occurred_at": "2026-08-03T10:00:00",
        },
    )

    # Day -2 (2026-08-04): -200ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 200,
            "occurred_at": "2026-08-04T10:00:00",
        },
    )

    # Day -1 (2026-08-05): +300ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 300,
            "occurred_at": "2026-08-05T10:00:00",
        },
    )

    # Current Shift (2026-08-06): +100ml, -50ml
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 100,
            "occurred_at": "2026-08-06T10:00:00",
        },
    )
    client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "URINE",
            "volume_ml": 50,
            "occurred_at": "2026-08-06T14:00:00",
        },
    )

    res_daily = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-06").json()

    # Assert 24h Balance = 50ml, Cumulative Balance = 650.0ml
    assert res_daily["balance_ml"] == 50
    assert res_daily["cumulative_balance"] == 650.0


def create_patient_for_dashboard(client):
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": "REC-QUAL-01",
            "full_name": "Paciente Qualitativo",
            "birth_date": "1991-03-25",
            "bed": "UTI 10",
            "health_insurance": "SUS",
        },
    )
    if res.status_code == 201:
        return res.json()["id"]
    p_res = client.get("/api/v1/patients")
    for p in p_res.json():
        if p["medical_record"] == "REC-QUAL-01":
            return p["id"]
    return p_res.json()[0]["id"]


def test_daily_balance_qualitative_records(client):
    patient_id = create_patient_for_dashboard(client)
    target_date = "2026-08-06"

    # 1. Pure quantitative record (should NOT be in qualitative_records, but SHOULD affect balance_ml)
    res_quant = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": 500,
            "occurred_at": "2026-08-06T10:00:00",
        },
    )
    assert res_quant.status_code == 201

    # 2. Pure qualitative record (should BE in qualitative_records, but NOT affect balance_ml)
    res_qual = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "OUTPUT",
            "category": "STOOL",
            "volume_ml": "++",
            "notes": "Aspecto pastoso",
            "occurred_at": "2026-08-06T11:00:00",
        },
    )
    assert res_qual.status_code == 201
    qual_id = res_qual.json()["id"]

    # Fetch daily balance
    balance_res = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date={target_date}")
    assert balance_res.status_code == 200
    daily_data = balance_res.json()

    # Assert balance is correct (only the 500ml input)
    assert daily_data["input_ml"] == 500
    assert daily_data["output_ml"] == 0
    assert daily_data["balance_ml"] == 500

    # Assert qualitative_records only contains the qualitative one
    qual_records = daily_data.get("qualitative_records", [])
    assert len(qual_records) == 1
    assert qual_records[0]["id"] == qual_id
    assert qual_records[0]["qualitative_value"] == "++"
    assert qual_records[0]["notes"] == "Aspecto pastoso"
    
    # Assert validation/serialization didn't break for qualitative_records
    assert qual_records[0]["volume_ml"] == "++" # Because of resolve_volume_and_qualitative logic


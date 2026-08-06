import pytest


def create_test_patient(client, mr="REC-VAL-01"):
    res = client.post(
        "/api/v1/patients",
        json={
            "medical_record": mr,
            "full_name": "Paciente Validação Hostil",
            "birth_date": "1985-06-15",
            "bed": "UTI 05",
            "health_insurance": "SUS",
        },
    )
    assert res.status_code in (201, 409)
    if res.status_code == 201:
        return res.json()["id"]
    # If 409 conflict, list patients and find id
    p_res = client.get("/api/v1/patients")
    for p in p_res.json():
        if p["medical_record"] == mr:
            return p["id"]
    return p_res.json()[0]["id"]


@pytest.mark.parametrize(
    "volume_input,expected_status,is_valid",
    [
        # Valid numerical inputs
        (100, 201, True),
        ("250", 201, True),
        ("50.5", 201, True),
        (0.5, 201, True),
        (1000, 201, True),
        # Qualitative values
        ("+", 201, True),
        ("++", 201, True),
        ("+++", 201, True),
        ("++++", 201, True),
        # Mixed and special strings
        ("+100", 201, True),
        ("250+", 201, True),
        ("++250", 201, True),
        ("abc100", 201, True),
        ("💉💧 100ml", 201, True),
        ("<script>alert('xss')</script>", 201, True),
        ("' OR '1'='1", 201, True),
        # Extremely long string (>50 chars should return 422)
        ("A" * 51, 422, False),
    ],
)
def test_hostile_volume_inputs(client, volume_input, expected_status, is_valid):
    patient_id = create_test_patient(client, mr="REC-VAL-HOSTILE")
    payload = {
        "patient_id": patient_id,
        "direction": "OUTPUT",
        "category": "URINE",
        "volume_ml": volume_input,
        "occurred_at": "2026-08-06T10:00:00",
    }
    response = client.post("/api/v1/balances/records", json=payload)
    assert response.status_code == expected_status
    assert response.status_code != 500

    if is_valid:
        data = response.json()
        assert "id" in data
        record_id = data["id"]
        # Verify fetching daily balance does not crash
        d_res = client.get(f"/api/v1/balances/patients/{patient_id}/daily?target_date=2026-08-06")
        assert d_res.status_code == 200
        assert "balance_ml" in d_res.json()


def test_empty_and_whitespace_volume_inputs(client):
    patient_id = create_test_patient(client, mr="REC-VAL-EMPTY")

    # Empty string should return 422 validation error
    res_empty = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": "",
            "occurred_at": "2026-08-06T10:00:00",
        },
    )
    assert res_empty.status_code == 422

    # Whitespace string should return 422 validation error
    res_space = client.post(
        "/api/v1/balances/records",
        json={
            "patient_id": patient_id,
            "direction": "INPUT",
            "category": "IV_HYDRATION",
            "volume_ml": "    ",
            "occurred_at": "2026-08-06T10:00:00",
        },
    )
    assert res_space.status_code == 422

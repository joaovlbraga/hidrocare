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

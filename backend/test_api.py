import pytest
import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_and_health():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Vigil" in data["service"]

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["status"] == "healthy"
    assert health_data["database"] == "connected"


def test_system_info():
    res = client.get("/api/system/info")
    assert res.status_code == 200
    data = res.json()
    assert data["total_patients"] >= 1
    assert data["total_reports"] >= 1
    assert data["total_medications"] >= 1


def test_auth_demo_and_me():
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "eleanor.vance@vigilhealth.ai"

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "eleanor.vance@vigilhealth.ai"


def test_otp_flow_and_registration():
    random_email = f"user_{uuid.uuid4().hex[:8]}@hospital.org"

    # 1. Direct password-only registration (no OTP needed)
    reg_res = client.post("/api/auth/signup", json={
        "email": random_email,
        "password": "StrongPassword123!",
        "full_name": "Dr. Verified",
        "role": "physician"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == random_email

    # 2. Standard Password Login
    login_res = client.post("/api/auth/login", json={
        "email": random_email,
        "password": "StrongPassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_patient_telemetry():
    res = client.get("/api/patient")
    assert res.status_code == 200
    data = res.json()
    assert "vitals" in data
    assert len(data["vitals"]) == 4
    assert "flagged_pattern" in data
    assert "active_conditions" in data


def test_medications_flow():
    # 1. Create prescribed medication
    create_res = client.post("/api/medications", json={
        "name": "Metformin",
        "dosage": "500 mg",
        "timing": "Morning",
        "category": "Glycemic Control"
    })
    assert create_res.status_code == 200
    new_id = create_res.json()["id"]

    # 2. Fetch medications
    res = client.get("/api/medications")
    assert res.status_code == 200
    meds = res.json()
    assert len(meds) >= 1

    # 3. Toggle medication
    toggle_res = client.patch(f"/api/medications/{new_id}/toggle")
    assert toggle_res.status_code == 200
    updated_med = toggle_res.json()
    assert updated_med["taken_today"] is True

    # 4. Clean up created medication
    del_res = client.delete(f"/api/medications/{new_id}")
    assert del_res.status_code == 200


def test_reports_and_biomarkers():
    # 1. On new registration, health records, night rest, and family circle are reset
    reg_email = f"new_patient_{uuid.uuid4().hex[:6]}@vigilhealth.ai"
    reg_res = client.post("/api/auth/signup", json={
        "email": reg_email,
        "password": "Password123!",
        "full_name": "New Registered Patient"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify reports are 0
    res_zero = client.get("/api/reports", headers=headers)
    assert res_zero.status_code == 200
    assert len(res_zero.json()["reports"]) == 0

    # Verify night rest is reset
    patient_res = client.get("/api/patient", headers=headers)
    assert patient_res.status_code == 200
    patient_data = patient_res.json()
    sleep_vital = next(v for v in patient_data["vitals"] if "sleep" in v["name"].lower())
    assert sleep_vital["value"] == "—"
    assert "Awaiting first night recording" in sleep_vital["status"]

    # Verify family care circle is reset to 0 members
    care_res = client.get("/api/care-circle", headers=headers)
    assert care_res.status_code == 200
    assert len(care_res.json()) == 0

    # Add a family care circle member for this patient
    add_care_res = client.post("/api/care-circle", json={
        "name": "Dr. Marcus Vance",
        "relationship_name": "Father",
        "role_tag": "Primary Family Proxy",
        "phone": "+1 (555) 321-9870",
        "permissions": "Full Emergency ICE, Daily Alerts"
    }, headers=headers)
    assert add_care_res.status_code == 200

    # 2. Uploading / analyzing document populates reports for the patient
    client.post("/api/documents/analyze", json={
        "preset_id": "quest_panel",
        "title": "Quest Comprehensive Metabolic & Lipid Panel",
        "document_type": "lab_report"
    }, headers=headers)

    res = client.get("/api/reports", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "reports" in data
    assert len(data["reports"]) >= 1
    assert "out_of_range_biomarkers" in data
    assert len(data["out_of_range_biomarkers"]) >= 1

    # 3. When this registered user signs in (/api/auth/login), ALL health records, night rest, and family circle ARE SAVED (NO RESET)
    login_res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    signin_token = login_res.json()["access_token"]
    signin_headers = {"Authorization": f"Bearer {signin_token}"}

    signin_reports = client.get("/api/reports", headers=signin_headers)
    assert signin_reports.status_code == 200
    assert len(signin_reports.json()["reports"]) >= 1, "Reports must NOT be reset on user sign in!"

    signin_care = client.get("/api/care-circle", headers=signin_headers)
    assert signin_care.status_code == 200
    assert len(signin_care.json()) == 1, "Family circle must NOT be reset on user sign in!"
    assert signin_care.json()[0]["name"] == "Dr. Marcus Vance"

    # 4. Existing demo sign in (/api/auth/demo) also preserves health records, night rest, and care circle
    demo_res = client.post("/api/auth/demo")
    assert demo_res.status_code == 200
    demo_token = demo_res.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    demo_reports = client.get("/api/reports", headers=demo_headers)
    assert demo_reports.status_code == 200
    assert len(demo_reports.json()["reports"]) >= 1

    demo_patient = client.get("/api/patient", headers=demo_headers)
    assert demo_patient.status_code == 200
    demo_sleep = next(v for v in demo_patient.json()["vitals"] if "sleep" in v["name"].lower())
    assert demo_sleep["value"] == "5.7 h"

    demo_care = client.get("/api/care-circle", headers=demo_headers)
    assert demo_care.status_code == 200
    assert len(demo_care.json()) >= 1



def test_document_analysis():
    # 1. Test lab report analysis
    res = client.post("/api/documents/analyze", json={
        "preset_id": "quest_panel",
        "title": "Quest Comprehensive Metabolic & Lipid Panel",
        "document_type": "lab_report"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "extracted_items" in data
    assert len(data["extracted_items"]) >= 1

    # 2. Test prescription analysis: populates medications and report
    rx_res = client.post("/api/documents/analyze", json={
        "preset_id": "jenkins_rx",
        "title": "Dr. Sarah Jenkins Rx Prescription Slip",
        "document_type": "prescription"
    })
    assert rx_res.status_code == 200
    rx_data = rx_res.json()
    assert rx_data["status"] == "success"
    assert rx_data["document_type"] == "prescription"
    assert "extracted_medications" in rx_data
    assert len(rx_data["extracted_medications"]) >= 1

    # Verify prescribed medicines are visible in /api/medications
    meds_res = client.get("/api/medications")
    assert meds_res.status_code == 200
    med_names = [m["name"].lower() for m in meds_res.json()]
    assert any("atorvastatin" in name or "coq10" in name for name in med_names)


def test_chat_and_citations():
    # Test chat streaming response
    res = client.post("/api/chat", json={"message": "Why is my resting heart rate high?"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    body = res.text
    assert "data: " in body
    assert "chunk" in body or "token" in body

    # Test history retrieval
    hist_res = client.get("/api/chat/history")
    assert hist_res.status_code == 200
    assert len(hist_res.json()) >= 1


def test_emergency_pass():
    res = client.get("/api/emergency-pass")
    assert res.status_code == 200
    data = res.json()
    assert "blood_type" in data
    assert "allergies" in data
    assert "emergency_contact_name" in data

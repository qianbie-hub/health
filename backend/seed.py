import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base, run_auto_migrations
import models
from auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    run_auto_migrations()
    db: Session = SessionLocal()

    try:
        # 1. Seed Default Demo Users
        demo_user = db.query(models.User).filter(models.User.email == "eleanor.vance@vigilhealth.ai").first()
        if not demo_user:
            demo_user = models.User(
                email="eleanor.vance@vigilhealth.ai",
                hashed_password=get_password_hash("password123"),
                full_name="Eleanor Vance",
                role="patient",
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

        # 2. Seed Patient Profile
        patient = db.query(models.Patient).first()
        if not patient:
            patient = models.Patient(
                user_id=demo_user.id,
                name="Eleanor Vance",
                greeting_date="Sunday 11 October",
                flagged_title="One pattern worth a look",
                flagged_description="Resting heart rate has risen 8 days in a row, from 69 to 78 bpm.",
                flagged_reason="Over the last 8 days, three of your readings moved together.",
                flagged_guidance="This pattern can come from stress, poor recovery or the start of an infection.",
                flagged_disclaimer="It is not a diagnosis. A check-up this week would help rule things out.",
                resting_heart_rate="78 bpm",
                resting_heart_rate_status="Outside your usual range",
                resting_heart_rate_trend="69 to 78 bpm (usual 60-75)",
                temperature="37.1°C",
                temperature_status="In your usual range",
                temperature_trend="36.6 to 37.1°C (still in range)",
                sleep="5.7 h",
                sleep_status="Outside your usual range",
                sleep_trend="6.8 to 5.7 hours (usual 7-9)",
                blood_pressure="129 mmHg",
                blood_pressure_status="In your usual range",
                blood_pressure_trend="120 to 129 mmHg (usual 115-125)",
                active_conditions="Elevated Resting HR Trend, Mild Sleep Fragmentation, Subclinical Inflammation, Dyslipidemia Watch"
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
        elif not patient.user_id or patient.user_id == demo_user.id:
            patient.user_id = demo_user.id
            patient.sleep = "5.7 h"
            patient.sleep_status = "Outside your usual range"
            patient.sleep_trend = "6.8 to 5.7 hours (usual 7-9)"
            patient.resting_heart_rate = "78 bpm"
            db.commit()

        # 3. Seed Emergency ICE Pass
        if not db.query(models.EmergencyPass).filter(models.EmergencyPass.patient_id == patient.id).first():
            ice_pass = models.EmergencyPass(
                patient_id=patient.id,
                blood_type="O Positive",
                allergies="Penicillin, Sulfa drugs",
                emergency_contact_name="Julian Vance (Spouse)",
                emergency_contact_phone="+1 (555) 389-1029",
                physician_name="Dr. Sarah Jenkins, MD",
                physician_phone="+1 (555) 742-9901",
                hospital_preference="Mercy Health Medical Center",
                dnr_status=False
            )
            db.add(ice_pass)
            db.commit()

        # 3b. Seed default Care Network Members
        if db.query(models.CareMember).filter(models.CareMember.patient_id == patient.id).count() == 0:
            care_members = [
                models.CareMember(
                    patient_id=patient.id,
                    name="Rohan Kapoor",
                    relationship_name="Spouse",
                    role_tag="Primary Proxy",
                    phone="+1 (555) 234-8901",
                    sync_status="Live Sync: 8m ago",
                    permissions="Real-Time Vitals, Emergency Override, Medication Tracking"
                ),
                models.CareMember(
                    patient_id=patient.id,
                    name="Sunita Sharma",
                    relationship_name="Mother",
                    role_tag="Family",
                    phone="+1 (555) 872-4412",
                    sync_status="Morning Digest",
                    permissions="Daily Wellness Check, Out-of-Range Alerts"
                ),
                models.CareMember(
                    patient_id=patient.id,
                    name="Dr. Sarah Jenkins",
                    relationship_name="Physician",
                    role_tag="Physician",
                    phone="+1 (555) 443-1200",
                    sync_status="Weekly Brief Sync",
                    permissions="Diagnostic Labs, 8-Day Trajectory Brief, Medication Adherence"
                ),
                models.CareMember(
                    patient_id=patient.id,
                    name="Aarav Sharma",
                    relationship_name="Brother",
                    role_tag="Secondary Proxy",
                    phone="+1 (555) 312-9980",
                    sync_status="Standby",
                    permissions="Emergency Standby, Vitals Access"
                )
            ]
            db.add_all(care_members)
            db.commit()

        # 4. Check medications
        if db.query(models.Medication).count() == 0:
            meds = [
                models.Medication(
                    patient_id=patient.id,
                    name="Metformin",
                    dosage="500 mg - With breakfast",
                    timing="Morning",
                    category="Glycemic Control",
                    taken_today=True
                ),
                models.Medication(
                    patient_id=patient.id,
                    name="Atorvastatin",
                    dosage="20 mg - Evening after dinner",
                    timing="Evening",
                    category="Lipid Management",
                    taken_today=False
                ),
                models.Medication(
                    patient_id=patient.id,
                    name="Magnesium Glycinate",
                    dosage="200 mg - 30m before bed",
                    timing="Night",
                    category="Sleep & Recovery",
                    taken_today=False
                ),
                models.Medication(
                    patient_id=patient.id,
                    name="Vitamin D3 + K2",
                    dosage="2,000 IU - Morning with food",
                    timing="Morning",
                    category="Immune Support",
                    taken_today=True
                ),
                models.Medication(
                    patient_id=patient.id,
                    name="CoQ10 (Ubiquinol)",
                    dosage="100 mg - Mid-day lunch",
                    timing="Afternoon",
                    category="Cardiovascular",
                    taken_today=False
                )
            ]
            db.add_all(meds)
            db.commit()

        # 5. Check diagnostic reports
        if db.query(models.DiagnosticReport).count() == 0:
            report1 = models.DiagnosticReport(
                patient_id=patient.id,
                title="Comprehensive Metabolic Panel & Lipid Profile",
                date="Oct 04, 2026",
                facility="Quest Diagnostics",
                category="Lipid & Metabolic",
                summary="Elevated LDL-C and borderline fasting glucose. Liver and kidney function tests remain healthy."
            )
            db.add(report1)
            db.commit()
            db.refresh(report1)

            biomarkers_report1 = [
                models.Biomarker(
                    report_id=report1.id,
                    name="LDL Cholesterol",
                    value="142",
                    unit="mg/dL",
                    reference_range="< 100 mg/dL",
                    status="out_of_range",
                    interpretation="Elevated atherogenic lipoprotein. May interact with vascular stress."
                ),
                models.Biomarker(
                    report_id=report1.id,
                    name="HDL Cholesterol",
                    value="54",
                    unit="mg/dL",
                    reference_range="> 50 mg/dL",
                    status="normal",
                    interpretation="Desirable cardioprotective level."
                ),
                models.Biomarker(
                    report_id=report1.id,
                    name="Fasting Glucose",
                    value="106",
                    unit="mg/dL",
                    reference_range="70 - 99 mg/dL",
                    status="out_of_range",
                    interpretation="Mildly elevated baseline fasting glucose."
                ),
                models.Biomarker(
                    report_id=report1.id,
                    name="HbA1c",
                    value="5.8",
                    unit="%",
                    reference_range="< 5.7 %",
                    status="out_of_range",
                    interpretation="Borderline glycated hemoglobin."
                ),
                models.Biomarker(
                    report_id=report1.id,
                    name="eGFR (Filtration Rate)",
                    value="96",
                    unit="mL/min/1.73m²",
                    reference_range="> 60 mL/min",
                    status="normal",
                    interpretation="Optimal kidney filtration."
                ),
                models.Biomarker(
                    report_id=report1.id,
                    name="ALT (Alanine Transaminase)",
                    value="24",
                    unit="U/L",
                    reference_range="7 - 35 U/L",
                    status="normal",
                    interpretation="Normal liver cell integrity."
                )
            ]
            db.add_all(biomarkers_report1)

            report2 = models.DiagnosticReport(
                patient_id=patient.id,
                title="Inflammatory & Hematology Panel",
                date="Sep 28, 2026",
                facility="Labcorp Clinical",
                category="Immune & Inflammatory",
                summary="hs-CRP marker is elevated at 3.4 mg/L, correlating with the recent 8-day resting heart rate uptrend and shortened sleep cycles."
            )
            db.add(report2)
            db.commit()
            db.refresh(report2)

            biomarkers_report2 = [
                models.Biomarker(
                    report_id=report2.id,
                    name="hs-CRP (C-Reactive Protein)",
                    value="3.4",
                    unit="mg/L",
                    reference_range="< 1.0 mg/L",
                    status="out_of_range",
                    interpretation="Significant marker of acute/chronic low-grade systemic inflammation and vascular stress."
                ),
                models.Biomarker(
                    report_id=report2.id,
                    name="White Blood Cell (WBC)",
                    value="7.4",
                    unit="x10^3/µL",
                    reference_range="4.0 - 11.0 x10^3/µL",
                    status="normal",
                    interpretation="Normal immune defense count."
                ),
                models.Biomarker(
                    report_id=report2.id,
                    name="Hemoglobin",
                    value="13.6",
                    unit="g/dL",
                    reference_range="12.0 - 15.5 g/dL",
                    status="normal",
                    interpretation="Adequate cellular oxygen carrying capacity."
                ),
                models.Biomarker(
                    report_id=report2.id,
                    name="Ferritin",
                    value="68",
                    unit="ng/mL",
                    reference_range="15 - 150 ng/mL",
                    status="normal",
                    interpretation="Normal iron reserve."
                )
            ]
            db.add_all(biomarkers_report2)
            db.commit()

        # 6. Seed initial greeting message in ChatLog
        if db.query(models.ChatLog).count() == 0:
            welcome_msg = models.ChatLog(
                user_id=demo_user.id,
                role="assistant",
                content="Hello Eleanor, I'm Vigil, your personal health copilot. I've analyzed your latest wearable vitals and recent diagnostic reports. I noticed your resting heart rate has elevated to 78 bpm over the past 8 days while sleep has dropped to 5.7 hours. What can I help you explore today?",
                citations=json.dumps([
                    {
                        "source": "Wearable Vitals (Today)",
                        "detail": "Resting HR: 78 bpm (+9 bpm over 8 days), Sleep: 5.7h",
                        "relevance": "Direct physiological correlate"
                    },
                    {
                        "source": "Labcorp Panel (Sep 28)",
                        "detail": "hs-CRP: 3.4 mg/L (Elevated > 1.0)",
                        "relevance": "Underlying inflammatory marker"
                    }
                ])
            )
            db.add(welcome_msg)
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully with demo user, patients, and clinical records!")

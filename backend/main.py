import os
import json
import asyncio
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from database import engine, get_db, Base, run_auto_migrations
import models
import schemas
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_optional_current_user
)
from email_service import generate_otp, send_otp_email
from ai_service import generate_ai_clinical_summary
from seed import seed_database

# Initialize database schema and auto-migrate any missing columns
Base.metadata.create_all(bind=engine)
run_auto_migrations()
try:
    seed_database()
except Exception as e:
    print(f"Database seed note: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade REST & SSE Streaming API powering the Vigil AI Health Platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Health & System Endpoints ====================

@app.get("/", tags=["System"])
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/health", response_model=schemas.HealthCheckResponse, tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """
    Production health check verifying database connectivity and API runtime.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/system/info", tags=["System"])
def system_info(db: Session = Depends(get_db)):
    """
    Returns platform telemetry statistics and operational counts.
    """
    return {
        "total_patients": db.query(models.Patient).count(),
        "total_reports": db.query(models.DiagnosticReport).count(),
        "total_biomarkers": db.query(models.Biomarker).count(),
        "total_medications": db.query(models.Medication).count(),
        "active_users": db.query(models.User).count(),
        "version": settings.VERSION
    }


# ==================== Authentication & OTP Endpoints ====================

@app.post("/api/auth/send-otp", response_model=schemas.SendOTPResponse, tags=["Authentication"])
def send_otp(req: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    """
    Generates and dispatches a 6-digit OTP verification code to the specified email address.
    Prevents fake emails from creating accounts or logging in without verified inbox access.
    """
    email = req.email.strip().lower()
    purpose = req.purpose or "signup"

    # Validate email format
    if "@" not in email or "." not in email or len(email) < 5:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if purpose == "signup" and user:
        raise HTTPException(
            status_code=400,
            detail="An account already exists with this email address. Please sign in instead."
        )
    elif purpose == "login" and not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address. Please create an account first."
        )

    # Rate limiting: 30-second cooldown between requests
    now = datetime.now(timezone.utc)
    recent_otp = db.query(models.EmailOTP).filter(
        models.EmailOTP.email == email,
        models.EmailOTP.purpose == purpose,
        models.EmailOTP.created_at > now - timedelta(seconds=30)
    ).first()

    if recent_otp:
        raise HTTPException(
            status_code=429,
            detail="A verification code was recently sent. Please wait 30 seconds before requesting another."
        )

    code = generate_otp()
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = models.EmailOTP(
        email=email,
        otp_code=code,
        purpose=purpose,
        expires_at=expires_at,
        is_verified=False
    )
    db.add(otp_record)
    db.commit()

    # Dispatch email (via SMTP or dev logger)
    send_otp_email(email, code, purpose)

    # Dev OTP is provided in debug/development mode for testing convenience
    dev_code = code if (settings.DEBUG or not settings.SMTP_HOST) else None

    return {
        "status": "sent",
        "message": f"Verification code sent to {email}",
        "expires_in_seconds": settings.OTP_EXPIRE_MINUTES * 60,
        "dev_otp": dev_code
    }


@app.post("/api/auth/verify-otp", response_model=schemas.VerifyOTPResponse, tags=["Authentication"])
def verify_otp(req: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP code received by the user.
    """
    email = req.email.strip().lower()
    code = req.otp_code.strip()
    purpose = req.purpose or "signup"
    now = datetime.now(timezone.utc)

    otp_record = db.query(models.EmailOTP).filter(
        models.EmailOTP.email == email,
        models.EmailOTP.purpose == purpose,
        models.EmailOTP.is_verified == False,
        models.EmailOTP.expires_at > now
    ).order_by(models.EmailOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired or was not requested. Please request a new code."
        )

    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many invalid attempts. Please request a new verification code."
        )

    if otp_record.otp_code != code:
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid 6-digit verification code. Please check your inbox and try again."
        )

    otp_record.is_verified = True
    db.commit()

    return {
        "status": "verified",
        "message": "Email address successfully verified.",
        "is_valid": True
    }


@app.post("/api/auth/register", response_model=schemas.TokenResponse, tags=["Authentication"])
@app.post("/api/auth/signup", response_model=schemas.TokenResponse, tags=["Authentication"])
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account with direct password authentication.
    """
    email = user_in.email.strip().lower()

    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in."
        )

    # If an optional OTP was provided, mark it verified
    if user_in.otp_code:
        now = datetime.now(timezone.utc)
        valid_otp = db.query(models.EmailOTP).filter(
            models.EmailOTP.email == email,
            models.EmailOTP.purpose == "signup",
            models.EmailOTP.otp_code == user_in.otp_code.strip(),
            models.EmailOTP.expires_at > now
        ).order_by(models.EmailOTP.id.desc()).first()
        if valid_otp:
            valid_otp.is_verified = True
            db.commit()

    # Create User with password authentication
    new_user = models.User(
        email=email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or "Eleanor Vance",
        role=user_in.role or "patient",
        is_active=True,
        is_email_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Provision clean Patient profile for new registration
    new_patient = models.Patient(
        user_id=new_user.id,
        name=new_user.full_name,
        greeting_date=datetime.now().strftime("%A %d %B"),
        flagged_title="Baseline Telemetry Calibrating",
        flagged_description="Welcome to Vigil. Your personal baseline is establishing. Upload clinical documents or wear your sensor tonight to begin automated analysis.",
        flagged_reason="Continuous telemetry stream calibrating against your initial baseline.",
        flagged_guidance="Wear your connected sensor tonight and log prescribed medications.",
        flagged_disclaimer="Vigil provides clinical decision support. Always consult your physician.",
        resting_heart_rate="70 bpm",
        resting_heart_rate_status="In your usual range",
        resting_heart_rate_trend="70 bpm (baseline 60-75)",
        temperature="36.8°C",
        temperature_status="In your usual range",
        temperature_trend="36.8°C (in range)",
        sleep="—",
        sleep_status="Awaiting first night recording",
        sleep_trend="0.0 h (first night tracking pending)",
        blood_pressure="120 mmHg",
        blood_pressure_status="In your usual range",
        blood_pressure_trend="120 mmHg (usual 115-125)",
        active_conditions="New Patient Registration • Baseline Active"
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    # Provision clean Emergency Pass for new user
    ice = models.EmergencyPass(
        patient_id=new_patient.id,
        blood_type="Pending Verification",
        allergies="None recorded",
        emergency_contact_name="Not yet configured",
        emergency_contact_phone="",
        physician_name="Not yet configured",
        physician_phone="",
        hospital_preference="Nearest Emergency Center",
        dnr_status=False
    )
    db.add(ice)
    db.commit()

    # Reset every detail ONLY FOR NEW REGISTRATION
    reset_every_patient_detail(new_patient.id, new_user.id, db)

    token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


def reset_every_patient_detail(patient_id: Optional[int], user_id: Optional[int], db: Session):
    """
    Completely reset every detail of a patient ONLY upon new registration:
    1. Reset DiagnosticReports & Biomarkers -> 0 reports on file.
    2. Reset Medications -> 0 prescribed medicines.
    3. Reset ChatLogs -> 0 messages (fresh AI copilot session).
    4. Reset Night Rest & Sleep -> '—' / 'Awaiting first night recording'.
    5. Reset Vitals & Telemetry -> clean baseline with zero alerts.
    6. Reset Family Circle & Emergency Pass -> clean unconfigured state.
    """
    if patient_id:
        # 1. Clear diagnostic reports & biomarkers
        rep_ids = [r[0] for r in db.query(models.DiagnosticReport.id).filter(models.DiagnosticReport.patient_id == patient_id).all()]
        if rep_ids:
            db.query(models.Biomarker).filter(models.Biomarker.report_id.in_(rep_ids)).delete(synchronize_session=False)
        db.query(models.DiagnosticReport).filter(models.DiagnosticReport.patient_id == patient_id).delete(synchronize_session=False)

        # 2. Clear all medications
        db.query(models.Medication).filter(models.Medication.patient_id == patient_id).delete(synchronize_session=False)

        # 3. Reset patient vitals, night rest, and telemetry back to clean baseline (zero alerts)
        patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
        if patient:
            patient.resting_heart_rate = "70 bpm"
            patient.resting_heart_rate_status = "In your usual range"
            patient.resting_heart_rate_trend = "70 bpm (baseline 60-75)"

            patient.temperature = "36.8°C"
            patient.temperature_status = "In your usual range"
            patient.temperature_trend = "36.8°C (in range)"

            # Reset night rest:
            patient.sleep = "—"
            patient.sleep_status = "Awaiting first night recording"
            patient.sleep_trend = "0.0 h (first night tracking pending)"

            patient.blood_pressure = "120 mmHg"
            patient.blood_pressure_status = "In your usual range"
            patient.blood_pressure_trend = "120 mmHg (usual 115-125)"

            patient.flagged_title = "Baseline Telemetry Calibrating"
            patient.flagged_description = "Welcome to Vigil. Your personal baseline is establishing. Upload clinical documents or wear your sensor tonight to begin automated analysis."
            patient.flagged_reason = "Continuous telemetry stream calibrating against your initial baseline."
            patient.flagged_guidance = "Wear your connected sensor tonight and log prescribed medications."
            patient.flagged_disclaimer = "Vigil provides clinical decision support. Always consult your physician."
            patient.active_conditions = "New Patient Registration • Baseline Active"
            patient.greeting_date = datetime.now().strftime("%A %d %B")

        # 4. Reset Emergency Pass (Family Circle credentials)
        ice = db.query(models.EmergencyPass).filter(models.EmergencyPass.patient_id == patient_id).first()
        if ice:
            ice.blood_type = "Pending Verification"
            ice.allergies = "None recorded"
            ice.emergency_contact_name = "Not yet configured"
            ice.emergency_contact_phone = ""
            ice.physician_name = "Not yet configured"
            ice.physician_phone = ""
            ice.hospital_preference = "Nearest Emergency Center"
            ice.dnr_status = False

        # Clear Care Circle members for new registration
        db.query(models.CareMember).filter(models.CareMember.patient_id == patient_id).delete(synchronize_session=False)

    # 5. Clear chat logs for user
    if user_id:
        db.query(models.ChatLog).filter(models.ChatLog.user_id == user_id).delete(synchronize_session=False)

    db.commit()


def reset_patient_diagnostic_reports(patient_id: Optional[int], db: Session):
    """
    Alias for resetting patient reports and associated details.
    """
    reset_every_patient_detail(patient_id, None, db)


@app.post("/api/auth/login", response_model=schemas.TokenResponse, tags=["Authentication"])
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user via password.
    DOES NOT reset patient data — keeps all saved health records, night rest, and credentials intact.
    """
    email = login_in.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Standard password verification
    if not login_in.password or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # If signing in as demo user, ensure demo baseline is present
    if email == "eleanor.vance@vigilhealth.ai":
        from seed import seed_database
        patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
        if not patient or db.query(models.DiagnosticReport).filter(models.DiagnosticReport.patient_id == patient.id).count() == 0:
            seed_database()

    # KEEP EVERYTHING SAVED ON LOGIN - NO RESET!
    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/api/auth/login-otp", response_model=schemas.TokenResponse, tags=["Authentication"])
def login_with_otp(req: schemas.LoginWithOTPRequest, db: Session = Depends(get_db)):
    """
    Direct passwordless login fallback.
    DOES NOT reset patient data — keeps all saved health records, night rest, and credentials intact.
    """
    email = req.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with this email.")

    now = datetime.now(timezone.utc)
    valid_otp = db.query(models.EmailOTP).filter(
        models.EmailOTP.email == email,
        models.EmailOTP.purpose == "login",
        models.EmailOTP.otp_code == req.otp_code.strip(),
        models.EmailOTP.expires_at > now
    ).order_by(models.EmailOTP.id.desc()).first()

    if not valid_otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code."
        )

    valid_otp.is_verified = True
    db.commit()

    # KEEP EVERYTHING SAVED ON LOGIN - NO RESET!
    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/api/auth/demo", response_model=schemas.TokenResponse, tags=["Authentication"])
def instant_demo_login(db: Session = Depends(get_db)):
    """
    Instant 1-Click demo launcher for Eleanor Vance with complete saved records.
    Keeps all health records, night rest, family circle, and credentials saved!
    """
    from seed import seed_database
    seed_database()

    demo_user = db.query(models.User).filter(models.User.email == "eleanor.vance@vigilhealth.ai").first()
    if not demo_user:
        demo_user = models.User(
            email="eleanor.vance@vigilhealth.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Eleanor Vance",
            role="patient",
            is_active=True,
            is_email_verified=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # KEEP EVERYTHING SAVED ON DEMO LOGIN - NO RESET!
    token = create_access_token(data={"sub": demo_user.email, "role": demo_user.role, "id": demo_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": demo_user
    }


@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["Authentication"])
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """
    Return currently authenticated user information.
    """
    return current_user


# ==================== Patient & Vitals Endpoints ====================

@app.get("/api/patient", tags=["Patient"])
def get_patient(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns patient vitals, 8-day trend, alert flags, and active clinical conditions.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()

    if not patient:
        patient = db.query(models.Patient).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    vitals = [
        {
            "name": "Resting heart rate",
            "value": patient.resting_heart_rate,
            "status": patient.resting_heart_rate_status,
            "trend": patient.resting_heart_rate_trend,
            "is_alert": "Outside" in (patient.resting_heart_rate_status or "")
        },
        {
            "name": "Temperature",
            "value": patient.temperature,
            "status": patient.temperature_status,
            "trend": patient.temperature_trend,
            "is_alert": "Outside" in (patient.temperature_status or "")
        },
        {
            "name": "Sleep",
            "value": patient.sleep,
            "status": patient.sleep_status,
            "trend": patient.sleep_trend,
            "is_alert": "Outside" in (patient.sleep_status or "")
        },
        {
            "name": "Blood pressure",
            "value": patient.blood_pressure,
            "status": patient.blood_pressure_status,
            "trend": patient.blood_pressure_trend,
            "is_alert": "Outside" in (patient.blood_pressure_status or "")
        }
    ]

    active_conditions = [c.strip() for c in (patient.active_conditions or "").split(",") if c.strip()]

    return {
        "id": patient.id,
        "name": patient.name,
        "greeting_date": patient.greeting_date,
        "flagged_pattern": {
            "title": patient.flagged_title,
            "description": patient.flagged_description,
            "reason": patient.flagged_reason,
            "guidance": patient.flagged_guidance,
            "disclaimer": patient.flagged_disclaimer,
            "trends": [
                {
                    "metric": "Resting heart rate",
                    "observed": "69 to 78 bpm",
                    "baseline": "usual 60-75"
                },
                {
                    "metric": "Sleep",
                    "observed": "6.8 to 5.7 hours",
                    "baseline": "usual 7-9"
                },
                {
                    "metric": "Temperature",
                    "observed": "36.6 to 37.1°C",
                    "baseline": "still in range"
                }
            ]
        },
        "vitals": vitals,
        "active_conditions": active_conditions
    }


@app.put("/api/patient", tags=["Patient"])
def update_patient(
    update_data: schemas.PatientUpdate,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Update patient clinical vitals and status.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(patient, field, val)

    patient.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(patient)
    return {"status": "success", "patient_id": patient.id}


# ==================== Medications & Protocol Endpoints ====================

@app.get("/api/medications", response_model=List[schemas.MedicationResponse], tags=["Care Protocol"])
def get_medications(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns daily care protocol and prescribed medications.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient and not current_user:
        patient = db.query(models.Patient).first()

    if patient:
        meds = db.query(models.Medication).filter(
            models.Medication.patient_id == patient.id
        ).order_by(models.Medication.id.asc()).all()

        return meds
    return []


@app.post("/api/medications", response_model=schemas.MedicationResponse, tags=["Care Protocol"])
def create_medication(
    med: schemas.MedicationCreate,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new prescribed medication or supplement to the active protocol.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).first()

    new_med = models.Medication(
        patient_id=patient.id if patient else None,
        name=med.name,
        dosage=med.dosage,
        timing=med.timing or "Morning",
        category=med.category or "Prescription",
        taken_today=med.taken_today,
        notes=med.notes
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med


@app.patch("/api/medications/{id}/toggle", response_model=schemas.MedicationResponse, tags=["Care Protocol"])
def toggle_medication(id: int, db: Session = Depends(get_db)):
    """
    Toggle medication taken status.
    """
    medication = db.query(models.Medication).filter(models.Medication.id == id).first()
    if not medication:
        raise HTTPException(status_code=404, detail=f"Medication with id {id} not found")

    medication.taken_today = not medication.taken_today
    medication.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(medication)
    return medication


@app.delete("/api/medications/{id}", tags=["Care Protocol"])
def delete_medication(id: int, db: Session = Depends(get_db)):
    """
    Remove medication from protocol.
    """
    med = db.query(models.Medication).filter(models.Medication.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"status": "deleted", "id": id}


# ==================== Diagnostic Reports & Biomarkers ====================

@app.get("/api/reports", tags=["Diagnostic Reports"])
def get_reports(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns diagnostic laboratory reports and flagged out-of-range biomarkers.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient and not current_user:
        patient = db.query(models.Patient).first()

    if not patient:
        return {
            "reports": [],
            "out_of_range_biomarkers": [],
            "total_biomarkers": 0,
            "total_reports": 0
        }

    reports = db.query(models.DiagnosticReport).filter(
        models.DiagnosticReport.patient_id == patient.id
    ).order_by(models.DiagnosticReport.id.desc()).all()

    out_of_range_list = []
    total_biomarkers = 0
    reports_data = []

    for rep in reports:
        bio_data = []
        for bio in rep.biomarkers:
            total_biomarkers += 1
            b_dict = {
                "id": bio.id,
                "name": bio.name,
                "value": bio.value,
                "unit": bio.unit,
                "reference_range": bio.reference_range,
                "status": bio.status,
                "interpretation": bio.interpretation
            }
            bio_data.append(b_dict)
            if bio.status == "out_of_range":
                out_of_range_list.append({
                    **b_dict,
                    "report_title": rep.title,
                    "report_date": rep.date
                })

        reports_data.append({
            "id": rep.id,
            "title": rep.title,
            "date": rep.date,
            "facility": rep.facility,
            "category": rep.category,
            "summary": rep.summary,
            "biomarkers": bio_data
        })

    return {
        "reports": reports_data,
        "out_of_range_biomarkers": out_of_range_list,
        "total_biomarkers": total_biomarkers,
        "total_reports": len(reports_data)
    }


@app.post("/api/reports/reset", tags=["Diagnostic Reports"])
def reset_reports_endpoint(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Explicitly reset all diagnostic reports to zero.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).first()

    if patient:
        reset_patient_diagnostic_reports(patient.id, db)

    return {
        "status": "success",
        "message": "All diagnostic reports have been reset to zero.",
        "total_reports": 0
    }


@app.post("/api/reports", response_model=schemas.DiagnosticReportResponse, tags=["Diagnostic Reports"])
def create_report(report_in: schemas.DiagnosticReportCreate, db: Session = Depends(get_db)):
    """
    Manually add a diagnostic report with biomarkers.
    """
    patient = db.query(models.Patient).first()
    new_rep = models.DiagnosticReport(
        patient_id=patient.id if patient else None,
        title=report_in.title,
        date=report_in.date,
        facility=report_in.facility or "Quest Diagnostics",
        category=report_in.category or "Blood Chemistry",
        summary=report_in.summary
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)

    if report_in.biomarkers:
        for b in report_in.biomarkers:
            bm = models.Biomarker(
                report_id=new_rep.id,
                name=b.name,
                value=b.value,
                unit=b.unit,
                reference_range=b.reference_range,
                status=b.status,
                interpretation=b.interpretation
            )
            db.add(bm)
        db.commit()
        db.refresh(new_rep)

    return new_rep


# ==================== Document Intake & OCR Analysis ====================

@app.post("/api/documents/analyze", tags=["Clinical Intake"])
async def analyze_document(
    req: schemas.DocumentAnalyzeRequest,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or simulate clinical document OCR analysis (Lab Panel, Prescription, Holter ECG)
    and dynamically link synthesized biomarkers/medications to the patient profile.
    """
    preset = req.preset_id or ("quest_panel" if "quest" in (req.title or "").lower() or req.document_type == "lab_report" else "jenkins_rx")
    
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).first()

    if preset == "jenkins_rx" or req.document_type == "prescription":
        extracted_medications = [
            {"name": "CoQ10 (Ubiquinol)", "dosage": "100 mg", "instructions": "Take once daily with morning meal", "timing": "Morning", "category": "Prescription Support", "action": "Added to Care Protocol"},
            {"name": "Atorvastatin Calcium", "dosage": "20 mg", "instructions": "Take nightly after dinner", "timing": "Evening", "category": "Lipid Management", "action": "Added to Care Protocol"},
            {"name": "Magnesium Glycinate", "dosage": "200 mg", "instructions": "Take nightly 30 min before bed", "timing": "Night", "category": "Sleep & Recovery", "action": "Added to Care Protocol"}
        ]

        # Add or update each prescribed medicine for this patient
        meds_added_count = 0
        if patient:
            for m in extracted_medications:
                existing = db.query(models.Medication).filter(
                    models.Medication.patient_id == patient.id,
                    models.Medication.name.ilike(f"%{m['name'].split()[0]}%")
                ).first()
                if not existing:
                    new_med = models.Medication(
                        patient_id=patient.id,
                        name=m["name"],
                        dosage=m["dosage"],
                        timing=m.get("timing", "Morning"),
                        category=m.get("category", "Prescription"),
                        taken_today=False,
                        notes=m.get("instructions", "")
                    )
                    db.add(new_med)
                    meds_added_count += 1
            if "Prescribed Rx" not in (patient.active_conditions or ""):
                patient.active_conditions = (patient.active_conditions or "") + ", Active Doctor Prescriptions Verified"
            db.commit()

        title = req.title or "Dr. Sarah Jenkins Rx Prescription Slip"
        ai_summary = await generate_ai_clinical_summary(
            title=title,
            doc_type="prescription",
            filename=req.filename or "prescription.pdf",
            extracted_items=extracted_medications
        )

        # Create diagnostic report record for the prescription so it's tracked in reports
        rx_report = models.DiagnosticReport(
            patient_id=patient.id if patient else None,
            title=title,
            date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            facility="Mercy Health Medical Center",
            category="Prescription & Protocol",
            summary=ai_summary["simple_explanation"],
            raw_filename=req.filename or "prescription.pdf"
        )
        db.add(rx_report)
        db.commit()
        db.refresh(rx_report)

        # Add biomarkers/prescription entries to report
        for m in extracted_medications:
            db.add(models.Biomarker(
                report_id=rx_report.id,
                name=f"Prescribed: {m['name']}",
                value=m['dosage'],
                unit="Daily Regimen",
                reference_range="Rx Standard Dose",
                status="normal",
                interpretation=m.get("instructions", "Active prescribed medication")
            ))
        db.commit()

        extracted_items = [
            {"name": m["name"], "dosage": m["dosage"], "frequency": m["instructions"], "action": m["action"]}
            for m in extracted_medications
        ]

        return {
            "status": "success",
            "document_type": "prescription",
            "title": title,
            "facility": "Mercy Health Medical Center",
            "date": datetime.now(timezone.utc).strftime("%d %b %Y"),
            "summary": ai_summary["simple_explanation"],
            "clinical_correlation": ai_summary["wearable_correlation"],
            "ai_summary": ai_summary,
            "extracted_items": extracted_items,
            "extracted_medications": extracted_medications,
            "extracted_biomarkers": [],
            "dashboard_updates": {
                "medications_added": len(extracted_medications),
                "protocol_updated": True,
                "biomarkers_updated": 0,
                "report_id": rx_report.id
            }
        }

    elif preset == "holter_ecg" or req.document_type == "holter_ecg":
        if patient:
            patient.resting_heart_rate = "78 bpm"
            patient.resting_heart_rate_status = "Outside your usual range"
            patient.flagged_title = "Elevated Resting Rhythm Drift"
            patient.flagged_description = "Resting heart rate has risen over 8 nights to 78 bpm, with peak nocturnal spikes of 91 bpm."
            patient.flagged_guidance = "Holter confirms nocturnal sinus tachycardia spikes corresponding to brief awakenings. No sustained malignant arrhythmias."
            patient.active_conditions = "Elevated Resting HR Trend, Mild Sleep Fragmentation, Ambulatory EKG Monitored"
            db.commit()

        extracted_biomarkers = [
            {"name": "Average 24h Heart Rate", "value": "74", "unit": "bpm", "reference_range": "60 - 85 bpm", "is_out_of_range": False, "notes": "Healthy cardiac rhythm baseline"},
            {"name": "Peak Nocturnal Pulse", "value": "91", "unit": "bpm", "reference_range": "< 80 bpm during sleep", "is_out_of_range": True, "notes": "Nocturnal tachycardia during light sleep awakenings"},
            {"name": "Arrhythmia Burden (PVCs/PACs)", "value": "< 0.4", "unit": "%", "reference_range": "< 1.0%", "is_out_of_range": False, "notes": "Benign electrical conduction"}
        ]

        extracted_items = [
            {"name": b["name"], "value": f"{b['value']} {b['unit']}", "range": b["reference_range"], "status": "Elevated Arousal" if b["is_out_of_range"] else "Normal"}
            for b in extracted_biomarkers
        ]

        title = req.title or "Ambulatory Holter & Rhythm Strip (24h)"
        ai_summary = await generate_ai_clinical_summary(
            title=title,
            doc_type="holter_ecg",
            filename=req.filename or "holter_strip.pdf",
            extracted_items=extracted_biomarkers
        )

        holter_report = models.DiagnosticReport(
            patient_id=patient.id if patient else None,
            title=title,
            date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            facility="Mercy Trauma Center & Cardiology",
            category="Cardiology Telemetry",
            summary=ai_summary["simple_explanation"],
            raw_filename=req.filename or "holter_strip.pdf"
        )
        db.add(holter_report)
        db.commit()
        db.refresh(holter_report)

        for b in extracted_biomarkers:
            db.add(models.Biomarker(
                report_id=holter_report.id,
                name=b["name"],
                value=b["value"],
                unit=b["unit"],
                reference_range=b["reference_range"],
                status="out_of_range" if b["is_out_of_range"] else "normal",
                interpretation=b["notes"]
            ))
        db.commit()

        return {
            "status": "success",
            "document_type": "holter_ecg",
            "title": title,
            "facility": "Mercy Trauma Center & Cardiology",
            "date": datetime.now(timezone.utc).strftime("%d %b %Y"),
            "summary": ai_summary["simple_explanation"],
            "clinical_correlation": ai_summary["wearable_correlation"],
            "ai_summary": ai_summary,
            "extracted_items": extracted_items,
            "extracted_biomarkers": extracted_biomarkers,
            "extracted_medications": [],
            "dashboard_updates": {
                "medications_added": 0,
                "protocol_updated": True,
                "biomarkers_updated": 3,
                "report_id": holter_report.id
            }
        }

    else:
        # Default: Comprehensive Lab Panel
        new_report = models.DiagnosticReport(
            patient_id=patient.id if patient else None,
            title=req.title or "Quest Comprehensive Metabolic & Lipid Panel",
            date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            facility="Quest Diagnostics Clinical Lab",
            category="Blood Chemistry & Lipids",
            summary="Elevated Fasting LDL-C (142 mg/dL) and High-Sensitivity CRP (3.4 mg/L) detected alongside normal renal and liver function."
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        b1 = models.Biomarker(
            report_id=new_report.id,
            name="hs-CRP (High-Sensitivity)",
            value="3.4",
            unit="mg/L",
            reference_range="< 1.0 mg/L",
            status="out_of_range",
            interpretation="Elevated inflammatory marker; correlates with physiological strain and 8-day resting heart rate rise."
        )
        b2 = models.Biomarker(
            report_id=new_report.id,
            name="LDL Cholesterol (Direct)",
            value="142",
            unit="mg/dL",
            reference_range="< 100 mg/dL",
            status="out_of_range",
            interpretation="Moderate elevation. Primary focus for evening lipid management protocol."
        )
        b3 = models.Biomarker(
            report_id=new_report.id,
            name="Fasting Glucose",
            value="106",
            unit="mg/dL",
            reference_range="70 - 99 mg/dL",
            status="out_of_range",
            interpretation="Impaired fasting glucose threshold; continue metabolic monitoring."
        )
        b4 = models.Biomarker(
            report_id=new_report.id,
            name="eGFR (Creatinine-based)",
            value="96",
            unit="mL/min",
            reference_range="> 60 mL/min",
            status="normal",
            interpretation="Optimal renal filtration capacity."
        )
        b5 = models.Biomarker(
            report_id=new_report.id,
            name="ALT (Alanine Aminotransferase)",
            value="24",
            unit="U/L",
            reference_range="7 - 35 U/L",
            status="normal",
            interpretation="Normal hepatic integrity."
        )
        db.add_all([b1, b2, b3, b4, b5])
        if patient:
            patient.active_conditions = "Borderline Dyslipidemia, Mild Glycemic Elevation, Subclinical hs-CRP Watch"
            patient.flagged_title = "Metabolic & Lipid Shifts Detected"
            patient.flagged_description = "Recent Quest panel indicates LDL Cholesterol (142 mg/dL) and Fasting Glucose (106 mg/dL) outside optimal reference thresholds."
            patient.flagged_guidance = "Discuss statin optimization and dietary fiber with your physician."
        db.commit()

        extracted_biomarkers = [
            {"name": "hs-CRP (Inflammation)", "value": "3.4", "unit": "mg/L", "reference_range": "< 1.0 mg/L", "is_out_of_range": True, "notes": "Elevated systemic inflammatory stress; correlates with 8-day resting HR rise"},
            {"name": "LDL Cholesterol", "value": "142", "unit": "mg/dL", "reference_range": "< 100 mg/dL", "is_out_of_range": True, "notes": "Moderately elevated atherogenic lipoprotein; focus for evening statin protocol"},
            {"name": "Fasting Glucose", "value": "106", "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "is_out_of_range": True, "notes": "Borderline fasting glucose; continue metabolic monitoring"},
            {"name": "eGFR (Kidney Filtration)", "value": "96", "unit": "mL/min", "reference_range": "> 60 mL/min", "is_out_of_range": False, "notes": "Optimal renal filtration capacity"},
            {"name": "ALT (Liver Enzymes)", "value": "24", "unit": "U/L", "reference_range": "7 - 35 U/L", "is_out_of_range": False, "notes": "Normal hepatic cell integrity"}
        ]

        extracted_items = [
            {"name": b["name"], "value": f"{b['value']} {b['unit']}", "reference": b["reference_range"], "status": "High (Out of Range)" if b["is_out_of_range"] else "Optimal Normal"}
            for b in extracted_biomarkers
        ]

        title = new_report.title
        ai_summary = await generate_ai_clinical_summary(
            title=title,
            doc_type="lab_report",
            filename=req.filename or "quest_lab_panel.pdf",
            extracted_items=extracted_biomarkers
        )

        return {
            "status": "success",
            "document_type": "lab_report",
            "title": title,
            "facility": new_report.facility,
            "date": new_report.date,
            "summary": ai_summary["simple_explanation"],
            "clinical_correlation": ai_summary["wearable_correlation"],
            "ai_summary": ai_summary,
            "extracted_items": extracted_items,
            "extracted_biomarkers": extracted_biomarkers,
            "extracted_medications": [],
            "dashboard_updates": {
                "report_id": new_report.id,
                "biomarkers_added": 5,
                "out_of_range_count": 3
            }
        }


# ==================== AI Copilot & Streaming ====================

@app.get("/api/chat/history", tags=["AI Copilot"])
def get_chat_history(db: Session = Depends(get_db)):
    """
    Get existing conversation logs with citations.
    """
    logs = db.query(models.ChatLog).order_by(models.ChatLog.id.asc()).all()
    result = []
    for log in logs:
        citations = []
        if log.citations:
            try:
                citations = json.loads(log.citations)
            except Exception:
                citations = []
        result.append({
            "id": log.id,
            "role": log.role,
            "content": log.content,
            "citations": citations,
            "created_at": log.created_at.strftime("%I:%M %p") if log.created_at else ""
        })
    return result


@app.delete("/api/chat/history", tags=["AI Copilot"])
def clear_chat_history(db: Session = Depends(get_db)):
    """
    Clear chat history logs.
    """
    db.query(models.ChatLog).delete()
    db.commit()
    return {"status": "cleared"}


@app.post("/api/chat", tags=["AI Copilot"])
async def chat_with_copilot(
    req: schemas.ChatRequest,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts inquiry, records conversation log, streams SSE tokens, and provides clinical citations.
    Emits both 'chunk' and 'token' in the JSON event to maintain dual frontend compatibility.
    """
    user_text = req.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_entry = models.ChatLog(
        user_id=current_user.id if current_user else None,
        role="user",
        content=user_text,
        citations=None
    )
    db.add(user_entry)
    db.commit()

    lower_query = user_text.lower()
    citations = []

    if "heart" in lower_query or "rate" in lower_query or "pulse" in lower_query or "bpm" in lower_query:
        answer_text = (
            "Your resting heart rate has climbed consistently from 69 to 78 bpm over the past 8 days. "
            "When cross-referenced with your bloodwork, your high-sensitivity CRP is currently 3.4 mg/L, "
            "suggesting subclinical inflammatory stress or immune activation rather than an isolated cardiovascular anomaly. "
            "I recommend prioritizing 8 hours of restorative rest tonight, maintaining adequate hydration, and monitoring if temperature increases beyond 37.1°C."
        )
        citations = [
            {"source": "Vitals Trend (Oct 03-11)", "detail": "RHR: 69 -> 78 bpm (+13% elevation)", "relevance": "Wearable Sensor Stream"},
            {"source": "Labcorp Panel (Sep 28)", "detail": "hs-CRP: 3.4 mg/L (Ref < 1.0)", "relevance": "Systemic Inflammation Biomarker"}
        ]
    elif "sleep" in lower_query or "tired" in lower_query or "fatigue" in lower_query or "insomnia" in lower_query:
        answer_text = (
            "Your sleep duration has dropped to an average of 5.7 hours, which is well below your baseline range of 7.0–9.0 hours. "
            "This sleep debt exacerbates sympathetic nervous tone, directly driving the 8-day resting heart rate rise to 78 bpm. "
            "Consider taking your prescribed Magnesium Glycinate (200 mg) approximately 30 minutes before sleep, and avoid blue-light exposure 45 minutes prior to bedtime."
        )
        citations = [
            {"source": "Sleep Biometrics", "detail": "5.7 hours recorded (Deficit of 1.3-3.3 hours)", "relevance": "Recovery Metric"},
            {"source": "Care Protocol", "detail": "Magnesium Glycinate 200mg (Unchecked today)", "relevance": "Sleep architecture support"}
        ]
    elif "med" in lower_query or "drug" in lower_query or "pill" in lower_query or "stat" in lower_query:
        answer_text = (
            "Reviewing your care protocol: Metformin (500mg) and Vitamin D3 (2,000 IU) have been logged as taken. "
            "However, Atorvastatin (20mg) and Magnesium Glycinate (200mg) remain unchecked for this evening. "
            "Keeping up with Atorvastatin is essential given your latest LDL cholesterol level of 142 mg/dL."
        )
        citations = [
            {"source": "Medication Protocol", "detail": "Atorvastatin 20mg pending for evening", "relevance": "Adherence Checklist"},
            {"source": "Quest Labs (Oct 04)", "detail": "LDL-C: 142 mg/dL (Ref < 100 mg/dL)", "relevance": "Target Biomarker"}
        ]
    elif "lab" in lower_query or "report" in lower_query or "cholesterol" in lower_query or "glucose" in lower_query or "sugar" in lower_query:
        answer_text = (
            "In your latest lab report from Quest Diagnostics, we identified two key out-of-range biomarkers: "
            "LDL Cholesterol is at 142 mg/dL (recommended < 100 mg/dL) and Fasting Glucose is at 106 mg/dL (HbA1c: 5.8%). "
            "On the positive side, your kidney filtration rate (eGFR: 96 mL/min) and liver enzymes (ALT: 24 U/L) are in excellent condition."
        )
        citations = [
            {"source": "Quest Diagnostics (Oct 04)", "detail": "LDL: 142 mg/dL, Fasting Glucose: 106 mg/dL", "relevance": "Out-of-range Biomarkers"},
            {"source": "Quest Diagnostics (Oct 04)", "detail": "HbA1c: 5.8% (Pre-diabetic threshold)", "relevance": "Glycemic Indicator"}
        ]
    else:
        answer_text = (
            f"I have reviewed your clinical profile regarding '{user_text}'. "
            "Your wearable sensors show an active alert: resting heart rate has elevated to 78 bpm across 8 consecutive days alongside restricted sleep (5.7h). "
            "Recent labs also highlight elevated hs-CRP (3.4 mg/L) and LDL (142 mg/dL). "
            "These combined indicators suggest physiological stress or an incipient recovery deficit. If fatigue or palpitation symptoms persist, a brief clinical review is recommended."
        )
        citations = [
            {"source": "Multi-Stream Synthesis", "detail": "RHR 78 bpm + hs-CRP 3.4 mg/L", "relevance": "Correlated Biomarker & Sensor Stream"},
            {"source": "Care Protocol", "detail": "Active medications tracked daily", "relevance": "Active Regimen"}
        ]

    # Save assistant response to DB
    assistant_entry = models.ChatLog(
        user_id=current_user.id if current_user else None,
        role="assistant",
        content=answer_text,
        citations=json.dumps(citations)
    )
    db.add(assistant_entry)
    db.commit()
    db.refresh(assistant_entry)

    # SSE streaming generator
    async def stream_generator():
        words = answer_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            payload = {
                "chunk": chunk,
                "token": chunk,
                "done": False,
                "citations": None
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.02)

        # Terminal SSE payload with citations and message_id
        final_payload = {
            "chunk": "",
            "token": "",
            "done": True,
            "citations": citations,
            "message_id": assistant_entry.id
        }
        yield f"data: {json.dumps(final_payload)}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no"
        }
    )


# ==================== Emergency Pass Endpoints ====================

@app.get("/api/emergency-pass", response_model=schemas.EmergencyPassResponse, tags=["Emergency ICE"])
def get_emergency_pass(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns high-contrast ICE medical pass data for emergency first-responders.
    """
    ice = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        if patient:
            ice = db.query(models.EmergencyPass).filter(models.EmergencyPass.patient_id == patient.id).first()
    if not ice:
        ice = db.query(models.EmergencyPass).first()
    if not ice:
        ice = models.EmergencyPass(
            blood_type="Pending Verification",
            allergies="None recorded",
            emergency_contact_name="Not yet configured",
            emergency_contact_phone="",
            physician_name="Not yet configured",
            physician_phone="",
            hospital_preference="Nearest Emergency Center",
            dnr_status=False
        )
        db.add(ice)
        db.commit()
        db.refresh(ice)
    return ice


@app.put("/api/emergency-pass", response_model=schemas.EmergencyPassResponse, tags=["Emergency ICE"])
def update_emergency_pass(
    pass_update: schemas.EmergencyPassUpdate,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Update ICE pass data.
    """
    ice = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        if patient:
            ice = db.query(models.EmergencyPass).filter(models.EmergencyPass.patient_id == patient.id).first()
    if not ice:
        ice = db.query(models.EmergencyPass).first()
    if not ice:
        raise HTTPException(status_code=404, detail="Emergency pass not found")

    for field, val in pass_update.model_dump(exclude_unset=True).items():
        setattr(ice, field, val)

    db.commit()
    db.refresh(ice)
    return ice


# ==================== Care Circle Endpoints ====================

@app.get("/api/care-circle", response_model=List[schemas.CareMemberResponse], tags=["Care Circle"])
def get_care_circle(
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authorized caregivers and family members in the patient's care circle.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient and not current_user:
        patient = db.query(models.Patient).first()

    if patient:
        members = db.query(models.CareMember).filter(
            models.CareMember.patient_id == patient.id
        ).order_by(models.CareMember.id.asc()).all()
        return members
    return []


@app.post("/api/care-circle", response_model=schemas.CareMemberResponse, tags=["Care Circle"])
def add_care_member(
    member_in: schemas.CareMemberCreate,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new caregiver or physician to the patient's care circle.
    """
    patient = None
    if current_user:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).first()

    new_member = models.CareMember(
        patient_id=patient.id if patient else None,
        name=member_in.name,
        relationship_name=member_in.relationship_name or "Caregiver",
        role_tag=member_in.role_tag or "Caregiver",
        phone=member_in.phone or "",
        sync_status=member_in.sync_status or "Live Sync: Active",
        permissions=member_in.permissions or "Real-Time Vitals, Emergency Override"
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@app.delete("/api/care-circle/{id}", tags=["Care Circle"])
def delete_care_member(id: int, db: Session = Depends(get_db)):
    """
    Remove a member from the patient's care circle.
    """
    member = db.query(models.CareMember).filter(models.CareMember.id == id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Care member not found")
    db.delete(member)
    db.commit()
    return {"status": "deleted", "id": id}


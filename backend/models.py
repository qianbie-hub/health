from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), default="Eleanor Vance")
    role = Column(String(50), default="patient")  # 'patient', 'caregiver', 'physician'
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="user", uselist=False)
    chat_logs = relationship("ChatLog", back_populates="user")


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="signup")  # 'signup', 'login'
    attempts = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), default="Eleanor Vance")
    greeting_date = Column(String(100), default="Sunday 11 October")

    # Flagged pattern / alert section
    flagged_title = Column(String(200), default="One pattern worth a look")
    flagged_description = Column(Text, default="Resting heart rate has risen 8 days in a row, from 69 to 78 bpm.")
    flagged_reason = Column(Text, default="Over the last 8 days, three of your readings moved together.")
    flagged_guidance = Column(Text, default="This pattern can come from stress, poor recovery or the start of an infection.")
    flagged_disclaimer = Column(Text, default="It is not a diagnosis. A check-up this week would help rule things out.")

    # Vitals (stored in JSON or explicit fields)
    resting_heart_rate = Column(String(50), default="78 bpm")
    resting_heart_rate_status = Column(String(50), default="Outside your usual range")
    resting_heart_rate_trend = Column(String(100), default="69 to 78 bpm (usual 60-75)")

    temperature = Column(String(50), default="37.1°C")
    temperature_status = Column(String(50), default="In your usual range")
    temperature_trend = Column(String(100), default="36.6 to 37.1°C (still in range)")

    sleep = Column(String(50), default="5.7 h")
    sleep_status = Column(String(50), default="Outside your usual range")
    sleep_trend = Column(String(100), default="6.8 to 5.7 hours (usual 7-9)")

    blood_pressure = Column(String(50), default="129 mmHg")
    blood_pressure_status = Column(String(50), default="In your usual range")
    blood_pressure_trend = Column(String(100), default="120 to 129 mmHg (usual 115-125)")

    # Comma-separated or serialized conditions
    active_conditions = Column(Text, default="Elevated Resting HR Trend, Mild Sleep Fragmentation, Borderline Dyslipidemia")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="patient")
    reports = relationship("DiagnosticReport", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    emergency_pass = relationship("EmergencyPass", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    care_members = relationship("CareMember", back_populates="patient", cascade="all, delete-orphan")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    name = Column(String(100), nullable=False)
    dosage = Column(String(100), nullable=False)
    timing = Column(String(50), default="Morning")
    category = Column(String(50), default="Prescription")
    taken_today = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    last_updated = Column(DateTime, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="medications")


class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    title = Column(String(200), nullable=False)
    date = Column(String(50), nullable=False)
    facility = Column(String(150), default="Quest Diagnostics")
    category = Column(String(100), default="Blood Chemistry")
    summary = Column(Text, nullable=True)
    raw_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    patient = relationship("Patient", back_populates="reports")
    biomarkers = relationship("Biomarker", back_populates="report", cascade="all, delete-orphan")


class Biomarker(Base):
    __tablename__ = "biomarkers"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("diagnostic_reports.id"))
    name = Column(String(100), nullable=False)
    value = Column(String(50), nullable=False)
    unit = Column(String(50), nullable=False)
    reference_range = Column(String(100), nullable=False)
    status = Column(String(50), default="normal")  # 'out_of_range', 'normal', 'borderline'
    interpretation = Column(Text, nullable=True)

    report = relationship("DiagnosticReport", back_populates="biomarkers")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)     # JSON string of citations
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="chat_logs")


class EmergencyPass(Base):
    __tablename__ = "emergency_passes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    blood_type = Column(String(10), default="O Positive")
    allergies = Column(Text, default="Penicillin, Sulfa drugs")
    emergency_contact_name = Column(String(100), default="Julian Vance (Spouse)")
    emergency_contact_phone = Column(String(50), default="+1 (555) 389-1029")
    physician_name = Column(String(100), default="Dr. Sarah Jenkins, MD")
    physician_phone = Column(String(50), default="+1 (555) 742-9901")
    hospital_preference = Column(String(150), default="Mercy Health Medical Center")
    dnr_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    patient = relationship("Patient", back_populates="emergency_pass")


class CareMember(Base):
    __tablename__ = "care_members"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    name = Column(String(100), nullable=False)
    relationship_name = Column(String(100), default="Caregiver")
    role_tag = Column(String(50), default="Caregiver")  # 'Primary Proxy', 'Family', 'Physician', etc.
    phone = Column(String(50), default="")
    sync_status = Column(String(100), default="Live Sync: Active")
    permissions = Column(Text, default="Real-Time Vitals, Emergency Override")
    created_at = Column(DateTime, default=utcnow)

    patient = relationship("Patient", back_populates="care_members")

from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# ==================== Auth & OTP Schemas ====================

class SendOTPRequest(BaseModel):
    email: str
    purpose: Optional[str] = "signup" # 'signup', 'login'

class SendOTPResponse(BaseModel):
    status: str
    message: str
    expires_in_seconds: int
    dev_otp: Optional[str] = None # Provided in development mode for convenience

class VerifyOTPRequest(BaseModel):
    email: str
    otp_code: str
    purpose: Optional[str] = "signup"

class VerifyOTPResponse(BaseModel):
    status: str
    message: str
    is_valid: bool

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Eleanor Vance"
    role: Optional[str] = "patient" # 'patient', 'caregiver', 'physician'
    otp_code: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: Optional[str] = None
    otp_code: Optional[str] = None

class LoginWithOTPRequest(BaseModel):
    email: str
    otp_code: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_email_verified: Optional[bool] = True
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================== Patient & Vitals Schemas ====================

class VitalItem(BaseModel):
    name: str
    value: str
    status: str
    trend: str
    is_alert: bool

class TrendItem(BaseModel):
    metric: str
    observed: str
    baseline: str

class FlaggedPattern(BaseModel):
    title: str
    description: str
    reason: str
    guidance: str
    disclaimer: str
    trends: List[TrendItem] = []

class PatientVitalsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    greeting_date: str
    flagged_pattern: dict
    vitals: List[VitalItem]
    active_conditions: List[str]

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    greeting_date: Optional[str] = None
    resting_heart_rate: Optional[str] = None
    temperature: Optional[str] = None
    sleep: Optional[str] = None
    blood_pressure: Optional[str] = None
    active_conditions: Optional[str] = None


# ==================== Medication Schemas ====================

class MedicationBase(BaseModel):
    name: str
    dosage: str
    timing: Optional[str] = "Morning"
    category: Optional[str] = "Prescription"
    taken_today: bool = False
    notes: Optional[str] = None

class MedicationCreate(MedicationBase):
    pass

class MedicationResponse(MedicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_updated: Optional[datetime] = None


# ==================== Diagnostic Report & Biomarker Schemas ====================

class BiomarkerBase(BaseModel):
    name: str
    value: str
    unit: str
    reference_range: str
    status: str = "normal" # 'out_of_range', 'normal', 'borderline'
    interpretation: Optional[str] = None

class BiomarkerCreate(BiomarkerBase):
    pass

class BiomarkerResponse(BiomarkerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: Optional[int] = None
    report_title: Optional[str] = None
    report_date: Optional[str] = None

class DiagnosticReportCreate(BaseModel):
    title: str
    date: str
    facility: Optional[str] = "Quest Diagnostics"
    category: Optional[str] = "Blood Chemistry"
    summary: Optional[str] = None
    biomarkers: Optional[List[BiomarkerCreate]] = []

class DiagnosticReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: str
    facility: str
    category: str
    summary: Optional[str] = None
    biomarkers: List[BiomarkerResponse] = []

class ReportsSummaryResponse(BaseModel):
    reports: List[DiagnosticReportResponse]
    out_of_range_biomarkers: List[BiomarkerResponse]
    total_biomarkers: int
    total_reports: int


# ==================== Chat & AI Schemas ====================

class ChatRequest(BaseModel):
    message: str

class Citation(BaseModel):
    source: str
    detail: str
    relevance: str

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: Optional[List[Citation]] = []
    created_at: str


# ==================== Document Analysis Schemas ====================

class DocumentAnalyzeRequest(BaseModel):
    title: Optional[str] = "Clinical Document"
    document_type: Optional[str] = "lab_report" # 'lab_report', 'prescription', 'holter_ecg'
    filename: Optional[str] = "document.pdf"
    raw_text: Optional[str] = None
    preset_id: Optional[str] = None


# ==================== Emergency Pass Schemas ====================

class EmergencyPassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    blood_type: str
    allergies: str
    emergency_contact_name: str
    emergency_contact_phone: str
    physician_name: str
    physician_phone: str
    hospital_preference: str
    dnr_status: bool

class EmergencyPassUpdate(BaseModel):
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    physician_name: Optional[str] = None
    physician_phone: Optional[str] = None
    hospital_preference: Optional[str] = None
    dnr_status: Optional[bool] = None


# ==================== Care Circle Schemas ====================

class CareMemberBase(BaseModel):
    name: str
    relationship_name: Optional[str] = "Caregiver"
    role_tag: Optional[str] = "Caregiver"
    phone: Optional[str] = ""
    sync_status: Optional[str] = "Live Sync: Active"
    permissions: Optional[str] = "Real-Time Vitals, Emergency Override"

class CareMemberCreate(CareMemberBase):
    pass

class CareMemberResponse(CareMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: Optional[int] = None



# ==================== Health & System Schemas ====================

class HealthCheckResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    database: str
    timestamp: str

# 🌿 Vigil - AI-Powered Personal Health Copilot

> **Enterprise Health Intelligence Stack**: Seamlessly unifying continuous wearable sensor telemetry (resting heart rate, HRV, nocturnal skin temperature, recovery cycles) with episodic clinical laboratory diagnostic records (blood chemistry panels, ECGs, prescriptions).

[![CI/CD Pipeline](https://github.com/vigil-health/vigil/actions/workflows/ci.yml/badge.svg)](https://github.com/vigil-health/vigil/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

---

## 🏛️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Browser / Mobile Client     │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │  Nginx Web Server (:80)       │
                                  │  - Gzip / Asset Caching       │
                                  │  - SPA Fallback Routing       │
                                  │  - SSE Non-Buffering Proxy    │
                                  └───────┬───────────────┬───────┘
                                          │               │
                         ┌────────────────┘               └────────────────┐
                         ▼                                                 ▼
          ┌─────────────────────────────┐                  ┌──────────────────────────────┐
          │  React 19 Vite Frontend     │                  │  FastAPI Backend (:8000)     │
          │  - 3D Biometric Core        │                  │  - JWT Auth & RBAC           │
          │  - Interactive Vitals Grid  │                  │  - Telemetry Synthesis       │
          │  - Daily Care Protocol      │                  │  - Server-Sent Events (SSE)  │
          │  - Document OCR Extraction  │                  │  - Health Probes & Metrics   │
          └─────────────────────────────┘                  └──────────────┬───────────────┘
                                                                          │
                                                                          ▼
                                                           ┌──────────────────────────────┐
                                                           │  PostgreSQL 16 / SQLite DB   │
                                                           │  - Users & Credentials       │
                                                           │  - Patients & Vitals         │
                                                           │  - Medications & Logs        │
                                                           │  - Diagnostic Reports & Labs │
                                                           │  - Emergency ICE Records     │
                                                           └──────────────────────────────┘
```

---

## ✨ Features & Capabilities

1. **Live Biometric Telemetry & Correlation**:
   - 2x2 vitals grid displaying continuous Resting Heart Rate, Core Temperature, Sleep Recovery, and Blood Pressure.
   - Dynamic clinical pattern engine that detects multi-stream shifts (e.g. 8-day resting HR climb correlated with sleep debt and high hs-CRP).

2. **Full-Spectrum Authentication & Email OTP Verification**:
   - Production JWT authentication with salted PBKDF2-HMAC-SHA256 password hashing.
   - **Mandatory Email OTP verification**: Blocks fake, mistyped, or unauthorized email registrations; accounts can only be created by users who verify their inbox.
   - Passwordless One-Time Email Code login option (`/api/auth/login-otp`) and standard password authentication.
   - Built-in SMTP delivery with responsive HTML clinical templates and console simulator fallback for local development.
   - 1-Click instant Eleanor Vance pre-verified demo access.

3. **Daily Care Protocol Checklist**:
   - Prescription tracking with optimistic UI updates and instant database synchronization (`/api/medications`).
   - Dopamine pill-check particle animation with persistent status updates.

4. **Diagnostic Reports & Biomarkers**:
   - Comprehensive lab report tracking (Quest Diagnostics, Labcorp, Hospital systems).
   - Flagged out-of-range indicators (hs-CRP, LDL Cholesterol, Fasting Glucose, HbA1c) with normal reference benchmarks.

5. **AI Clinical Copilot & Streaming**:
   - Real-time Server-Sent Events (SSE) streaming answers tailored to patient queries.
   - Grounded evidence citations directly linking symptoms to wearable sensor trends and blood chemistry panels.

6. **Optical Clinical Intake Simulation**:
   - Intelligent OCR document analyzer accepting Lab Panels, Prescription slips, and Holter ECG strips.
   - Automatically parses new biomarkers and adds newly prescribed medications to the active daily protocol.

7. **Emergency Medical Pass (ICE)**:
   - High-contrast, first-responder ready emergency pass with blood type, active conditions, allergies, and physician emergency contacts.

---

## 🛠️ API Reference

Interactive Swagger API documentation is available at `http://localhost:8000/docs` or `http://127.0.0.1:8000/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service root and health status |
| `GET` | `/api/health` | Production readiness probe (DB status & uptime) |
| `GET` | `/api/system/info` | Operational counts (patients, reports, meds, users) |
| `POST` | `/api/auth/send-otp` | Dispatch 6-digit OTP code to email address |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit email OTP code |
| `POST` | `/api/auth/register` | Register verified user account + patient profile (requires OTP) |
| `POST` | `/api/auth/login` | Authenticate user via password or OTP code |
| `POST` | `/api/auth/login-otp` | Passwordless direct login via verified email OTP |
| `POST` | `/api/auth/demo` | 1-Click instant demo login (Eleanor Vance) |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/patient` | Get vitals grid, 8-day telemetry trends, alert patterns |
| `PUT` | `/api/patient` | Update patient vitals and active conditions |
| `GET` | `/api/medications` | List daily care protocol medications |
| `POST` | `/api/medications` | Add prescription or supplement to protocol |
| `PATCH` | `/api/medications/{id}/toggle` | Toggle medication taken status |
| `DELETE` | `/api/medications/{id}` | Remove medication from protocol |
| `GET` | `/api/reports` | Get diagnostic lab reports and out-of-range biomarkers |
| `POST` | `/api/reports` | Add manual diagnostic lab panel with biomarkers |
| `POST` | `/api/documents/analyze` | Document OCR intake & automated protocol synthesis |
| `POST` | `/api/chat` | SSE real-time streaming copilot with lab citations |
| `GET` | `/api/chat/history` | Fetch persistent chat logs |
| `DELETE` | `/api/chat/history` | Clear chat logs |
| `GET` | `/api/emergency-pass` | Get first-responder ICE pass data |
| `PUT` | `/api/emergency-pass` | Update emergency contacts and medical alert info |

---

## 🚀 Quick Start (Local Development)

### Single Command (Windows PowerShell)
```powershell
.\start-dev.ps1
```

### Or Start Individually
**1. Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**2. Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

---

## 🚢 Production Deployment

For detailed guides covering cloud VPS, AWS ECS, Railway, Render, and Let's Encrypt SSL, see [DEPLOYMENT.md](file:///c:/Users/Shitanshu%20verma/Downloads/Vigil/DEPLOYMENT.md).

### One-Click Docker Compose
```bash
# 1. Setup production environment secrets
cp .env.example .env

# 2. Deploy stack
docker compose up -d --build
```

### Production Deployment Script
- **Linux / Cloud VPS**: `./deploy.sh`
- **Windows**: `powershell -File .\deploy.ps1`

---

## 🧪 Automated Testing

Run the test suite covering authentication, vitals, medications, lab reports, document intake, and SSE streaming:
```powershell
# Run backend tests
npm run test

# Or via pytest directly
cd backend
.\venv\Scripts\pytest.exe test_api.py -v
```
Output:
```
backend/test_api.py::test_root_and_health PASSED
backend/test_api.py::test_system_info PASSED
backend/test_api.py::test_auth_demo_and_me PASSED
backend/test_api.py::test_auth_registration_and_login PASSED
backend/test_api.py::test_patient_telemetry PASSED
backend/test_api.py::test_medications_flow PASSED
backend/test_api.py::test_reports_and_biomarkers PASSED
backend/test_api.py::test_document_analysis PASSED
backend/test_api.py::test_chat_and_citations PASSED
backend/test_api.py::test_emergency_pass PASSED
========== 10 passed in 2.70s ==========
```

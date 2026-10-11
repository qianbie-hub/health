# Vigil Development Guide (For Antigravity Agents & Collaborators)

## 🎯 Project Overview
**Vigil** is an AI-powered personal health companion that bridges continuous wearable sensor telemetry (resting heart rate, HRV, circadian skin temperature, sleep recovery) with episodic clinical laboratory diagnostic records (blood panels, ECGs, prescriptions).

---

## 🏗️ Architecture & Services

### 1. Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Three.js + Framer Motion.
- **Port**: `http://127.0.0.1:5173/` (Dev) / `http://localhost:80/` (Prod)
- **Proxy Configuration**: `/api` requests are automatically proxied to the backend at `http://127.0.0.1:8000`.
- **Components**:
  - `pages/HomePage.tsx`: Universal marketing page with 3D WebGL Biometric Core, color-negate bio-fluoroscopy stage, membership tiers, and FAQ accordion.
  - `Dashboard.tsx`: Patient health dashboard with 2x2 vitals grid, 8-day historical telemetry chart, AI optical intake simulator, Daily Care Protocol checklist, diagnostic reports viewer, and real-time streaming copilot with citations.
  - `components/AuthModal.tsx`: Fully integrated with live backend auth endpoints (`/api/auth/signup`, `/api/auth/login`, `/api/auth/demo`), stores JWT token, and handles errors with live feedback.
  - `App.tsx`: Manages hash routing, validates active JWT sessions on mount via `/api/auth/me`, and coordinates dashboard access gates.

### 2. Backend (`/backend`)
- **Framework**: FastAPI + Python 3.11/3.14 + SQLAlchemy + PostgreSQL & SQLite dual support + Pydantic v2.
- **Port**: `http://127.0.0.1:8000/`
- **Key Modules**:
  - `main.py`: Production REST and SSE Streaming API endpoints:
    - Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/demo`, `GET /api/auth/me`.
    - Patient: `GET /api/patient`, `PUT /api/patient`.
    - Care Protocol: `GET /api/medications`, `POST /api/medications`, `PATCH /api/medications/{id}/toggle`, `DELETE /api/medications/{id}`.
    - Diagnostics: `GET /api/reports`, `POST /api/reports`, `POST /api/documents/analyze`.
    - AI Copilot: `POST /api/chat` (SSE streaming with citations), `GET /api/chat/history`, `DELETE /api/chat/history`.
    - Emergency ICE: `GET /api/emergency-pass`, `PUT /api/emergency-pass`.
    - System & Health: `GET /api/health`, `GET /api/system/info`.
  - `models.py`: SQLAlchemy database models (`User`, `Patient`, `Medication`, `DiagnosticReport`, `Biomarker`, `ChatLog`, `EmergencyPass`).
  - `schemas.py`: Pydantic v2 validation models using `ConfigDict(from_attributes=True)`.
  - `auth.py`: PBKDF2-HMAC-SHA256 password hashing, JWT encoding/decoding, and FastAPI OAuth2 dependencies.
  - `database.py`: PostgreSQL connection pool and SQLite engine with foreign key pragmas.
  - `config.py`: Environment-based settings management with `.env` support.
  - `seed.py`: Idempotent database seeder with Eleanor Vance demo patient, medications, lab panels, and emergency pass.
  - `test_api.py`: Automated pytest suite covering all 10 core API workflows (100% pass rate).

---

## 🚀 How to Run Locally

### Start Both Services (Single Command)
```powershell
.\start-dev.ps1
```

### Run Automated Tests
```powershell
npm run test
```

### Build Production Bundle
```powershell
npm run build
```

---

## 🚢 Production Deployment

See [DEPLOYMENT.md](file:///c:/Users/Shitanshu%20verma/Downloads/Vigil/DEPLOYMENT.md) for full cloud and server deployment guides.

### 1-Click Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```
Deploy scripts:
- Linux / Cloud VPS: `./deploy.sh`
- Windows: `powershell -File .\deploy.ps1`

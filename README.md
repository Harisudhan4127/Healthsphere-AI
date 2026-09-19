# HealthSphere AI

**Adaptive healthcare intelligence for preventive monitoring, disease-risk assessment, medication safety, and emergency response — in one explainable platform.**

HealthSphere AI is an adaptive healthcare intelligence platform that unifies preventive health monitoring, disease-risk assessment, medication safety, and emergency response into a single explainable digital health platform. Its modular architecture enables deployment for individuals and small clinics while providing a scalable path toward hospitals and larger healthcare networks.

---

## Problem

Individuals and small clinics juggle fragmented health signals — wearable vitals, patient-reported symptoms, medication storage conditions, and emergency events — with no unified way to reason about them. Risk assessments are either black-box AI predictions (untrustworthy in healthcare) or manual checklists. Medication safety and emergency response are siloed from everyday monitoring.

## Solution

HealthSphere AI binds these signals into a **deterministic, explainable risk engine** that aggregates Health Metrics, Reported Symptoms, Disease Risk Indicators, Medication Status, Emergency Status, and Health Trend into a single 0–100 risk score with transparent per-factor contributions. A pluggable LLM layer generates natural-language explanations of *why* a risk is elevated — never as a diagnosis, always as decision support.

## Features

- [x] Role-based access — Admin, Clinician, Emergency Responder, User
- [x] Patient registry with demographics, status, and search
- [x] Preventive health monitoring — vitals (heart rate, SpO₂, temperature, activity, sleep)
- [x] Patient-reported symptom capture
- [x] Deterministic **explainable risk engine** with transparent factor contribution
- [x] Disease-risk assessment with explicit medical disclaimers (decision support, not diagnosis)
- [x] Medication storage monitoring with temperature/duration breach alerts
- [x] Emergency detection with audited lifecycle (Detected → Verifying → Alerted → Responding → Resolved)
- [x] Alert centre with severity filtering and resolution workflow
- [x] Dashboard KPIs and analytics (risk trend, alert trend, medication safety)
- [x] Configurable modules, organization settings, and risk thresholds
- [x] Audit logging for regulatory-grade traceability
- [x] AI explanation layer with deterministic-templated fallback
- [x] Full test suites (backend `pytest`, frontend `vitest`)
- [x] CI pipeline with credential scanning, containerized deployment

## Architecture

![System Architecture](Architecture/system-architecture.png)

- **Backend** — FastAPI modular monolith (`app/api`, `app/services`, `app/intelligence`, `app/integrations`). Exposes a REST API under `/api/v1`.
- **Frontend** — React + Vite SPA with lazy-loaded pages, server-state caching (TanStack Query), and a component design system.
- **Intelligence Layer** — deterministic risk engine + explainability + LLM integration (pluggable; template fallback when no API key).
- **Data Layer** — SQLAlchemy ORM with Alembic migrations. SQLite for local dev, PostgreSQL in production.
- **Security** — JWT auth, bcrypt password hashing, RBAC dependencies, security headers, CORS policy, audit trail.

```
┌──────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                        │
│  Login · Dashboard · Patients · Analytics · Emergency     │
│  Alerts · Settings — TanStack Query + React Router        │
└──────────────────────────┬───────────────────────────────┘
                           │ REST (JWT)
┌──────────────────────────▼───────────────────────────────┐
│  FastAPI Modular Monolith                                │
│  api routers → services → intelligence → integrations     │
│  ┌─────────────────┐  ┌──────────────────┐               │
│  │ Risk Engine     │  │ AI Explanation   │  LLM (plugab.)│
│  │ (deterministic) │  │ (LLM + fallback) │               │
│  └─────────────────┘  └──────────────────┘               │
└──────────────────────────┬───────────────────────────────┘
                           │ SQLAlchemy / Alembic
              ┌────────────▼────────────┐
              │ SQLite (dev) / Postgres │
              └─────────────────────────┘
```

Detailed design: [`docs/architecture.md`](docs/architecture.md)

## Modules

| Module | Description | API prefix |
|---|---|---|
| **Auth & Access** | Registration, JWT login, RBAC (`/auth/roles`), organization | `/auth` |
| **Patients** | Registry, demographics, status filtering, archived handling | `/patients` |
| **Health Monitoring** | Vitals capture, summary, 30-day trends, symptoms | `/patients/{id}/health` |
| **Disease Risk** | Decision-support assessments with disclaimer + explanation | `/patients/{id}/disease-assessment` |
| **Medication Safety** | Medications, storage requirements, readings, breach alerts | `/patients/{id}/medications` |
| **Emergency** | Event creation, audited status lifecycle, timelines | `/emergencies` |
| **Risk** | Recalculate / fetch explainable risk score | `/patients/{id}/risk` |
| **Alerts** | Aggregate centre, severity/status filtering, resolution | `/alerts` |
| **Dashboard / Analytics** | KPIs, risk distribution, trends, insights | `/dashboard` `/analytics` |
| **Settings** | Module toggles, org settings, risk thresholds | `/settings` |

## AI Approach

1. **Deterministic risk scoring** — six weighted factors produce the risk score. Rules are transparent, versioned, and auditable.
2. **Explainable AI layer** — a per-factor contribution breakdown (`Health +43%`, `Emergency +25%`, …) is always shown.
3. **LLM narration (optional)** — natural-language explanations generated from the deterministic factors. Falls back to a deterministic explanation template when `AI_API_KEY` is unset, so the platform works fully offline.
4. **Safety** — the LLM is confined to explaining computed results; it never produces diagnoses. Disease assessments carry an explicit disclaimer in every response.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts, React Router |
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic |
| Auth | PyJWT (HS256), bcrypt |
| AI | httpx-based LLM client (OpenAI-compatible) + deterministic fallback |
| Database | PostgreSQL 16 (prod) / SQLite (dev) |
| Infra | Docker, docker-compose, GitHub Actions CI, Vercel (frontend), Render (backend) |

## Database

| Table | Purpose |
|---|---|
| `users`, `organizations` | Auth, roles, org scoping |
| `patients` | Demographics + deduplication key |
| `health_records` | Vitals snapshots (indexed on `(patient_id, recorded_at)`) |
| `symptoms` | Patient-reported symptoms |
| `disease_assessments` | Decision-support assessments |
| `medications`, `medication_readings` | Storage requirements + telemetry readings |
| `emergency_events` | Emergency lifecycle with multi-state timeline |
| `alerts` | Aggregated urgent conditions |
| `risk_assessments` | Historical risk scores |
| `audit_logs` | Immutable action trail |
| `module_configs` | Per-organization module toggles |

Schema managed via Alembic migrations (`backend/migrations/versions`).

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/            # Routers (auth, patients, health, disease, medication,
│   │   │                   #  emergency, risk, alerts, dashboard, analytics, settings)
│   │   ├── core/           # Config, database, security, audit
│   │   ├── intelligence/   # Risk engine, explainability, recommendations
│   │   ├── integrations/   # AI provider (LLM client + fallback)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response models
│   │   └── services/       # Business logic per module
│   ├── migrations/         # Alembic migrations
│   ├── tests/              # pytest API suites
│   ├── scripts/            # seed_demo_data.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Design system (badges, gauges, cards, states)
│   │   ├── features/       # Health, DiseaseRisk, Medication sections
│   │   ├── hooks/          # useAuth, useTheme
│   │   ├── layouts/        # AppLayout (sidebar + topbar)
│   │   ├── pages/          # Login, Dashboard, Patients, PatientDetail,
│   │   │                   #  Analytics, Emergency, Alerts, Settings, NotFound
│   │   ├── services/       # API client (JWT, axios-style fetch)
│   │   └── test/           # vitest setup
│   ├── index.html
│   ├── vitest.config.ts
│   ├── nginx.conf          # Prod reverse-proxy + gzip
│   └── Dockerfile
├── .github/workflows/ci.yml
├── docker-compose.yml
├── render.yaml             # Render blueprint (backend + Postgres)
├── vercel.json             # Vercel SPA rewrite to backend
└── docs/
    ├── architecture.md
    └── api.md
```

## Installation

Requirements: Python 3.12+, Node 20+.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Database (SQLite dev)
alembic upgrade head

# Seed demo data
python -m scripts.seed_demo_data

# Frontend
cd ../frontend
npm install
```

## Environment Variables

Backend (see `backend/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./healthsphere.db` | SQLAlchemy URL (`postgresql://…` in prod) |
| `JWT_SECRET` | `change-me…` | HS256 signing secret (must be long in prod) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | JWT lifetime |
| `CORS_ORIGINS` | local origins | JSON array of allowed origins |
| `AI_API_KEY` | *(empty)* | LLM key; empty → template explanations |
| `AI_API_URL` / `AI_MODEL` | OpenAI-compatible | Provider endpoint / model |
| `RISK_LOW_MAX` / `RISK_MODERATE_MAX` / `RISK_ELEVATED_MAX` | `24/49/74` | Configurable risk bands |

Frontend: `VITE_API_URL` (defaults to `"/api/v1"`, proxied to `localhost:8000` in dev).

## Running Locally

```bash
# Terminal 1 — backend (http://localhost:8000, Swagger at /docs)
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Demo Credentials

> **Important** — change these in production. Seed data is for local evaluation only.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@healthsphere.ai` | `admin123` |
| Clinician | `clinician@healthsphere.ai` | `clinician123` |
| Emergency Responder | `emergency@healthsphere.ai` | `emergency123` |

Demo dataset: 6 patients, a moderate-risk case (Kavitha), an elevated-risk case (Rajesh) with an active emergency, a medication temperature breach, and resolved alert/emergency history — designed to exercise every dashboard widget.

## API Documentation

Interactive Swagger UI is served at `http://localhost:8000/docs`; OpenAPI JSON at `/openapi.json`. A hand-written endpoint reference lives in [`docs/api.md`](docs/api.md). All endpoints are scoped under `/api/v1`, require a JWT (`Authorization: Bearer <token>`), and are role-guarded (Admin / Clinician / Emergency Responder).

### Quickstart

```bash
# Login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@healthsphere.ai","password":"admin123"}'

# Recalculate an explainable risk score
curl -s -X POST http://localhost:8000/api/v1/patients/<patient_id>/risk/recalculate \
  -H "Authorization: Bearer $TOKEN"
```

## Deployment

### Containers (any host)

```bash
docker compose up --build
# → frontend on :80 (nginx, proxies /api to backend), backend on :8000, Postgres on :5432
```

### Vercel — frontend

Import the repo (framework: Vite); `vercel.json` rewrites `/api/*` to the hosted backend and pins security headers. Set `VITE_API_URL` if not using the default rewrite.

### Render — backend + database

`render.yaml` is a blueprint that provisions a free `healthsphere-backend` web service and a `healthsphere-db` Postgres, auto-wiring `DATABASE_URL`, generating `JWT_SECRET`, and running `alembic upgrade head`. Set `CORS_ORIGINS` to your deployed frontend URL.

### GitHub Actions

`.github/workflows/ci.yml` runs backend tests (with coverage), frontend typecheck/tests/build on `pytest --cov`, and a secret-scanning job that (a) greps git history for private keys/cloud credentials and (b) fails if `.env` is ever tracked.

## Scalability

```
Small Scale            →  Single-tenant FastAPI app + SQLite on one box
         ↓
Modular Monolith       →  Current state: well-bounded services, shared DB
         ↓
Medium Scale           →  Independently scalable services (PostgreSQL, async workers)
         ↓
Large Scale            →  Distributed healthcare platform (event-driven, service mesh)
```

Each module (`health`, `disease`, `medication`, `emergency`, `alerts`) is already a separate `app/services` package with its own API routes, models, and tests. When workload warrants, any module can be extracted into its own service — its contracts are the existing REST schemas.

## Adaptability

- **Configurable modules** — every module can be toggled per organization (`/settings`, `module_configs` table)
- **Configurable risk rules** — risk bands are environment-configurable (`RISK_LOW_MAX`, …)
- **Configurable organization settings** — per-org configuration stored and served
- **Role-based access** — Admin, Clinician, Emergency Responder, User
- **Pluggable integrations** — the AI provider is an interface with a template fallback; new providers are drop-in
- **API-first architecture** — every capability is exposed through versioned REST endpoints

## Future Scope

- **Wearable devices** — stream heart rate, SpO₂, steps from smartwatches/fitness bands via WebSocket ingestion
- **IoT devices** — cold-chain/GPS sensors for medication and equipment monitoring
- **Diagnostic systems** — lab-result and imaging integration
- **Hospital EHR** — patient records sync with existing hospital systems
- **FHIR-compatible systems** — standard interoperability layer for data exchange
- **Emergency services** — automatic dispatch to nearby responders with live patient context

## Safety & Limitations

> **HealthSphere AI is a decision-support system, not a medical device.** The disease-risk module performs risk *assessment* only and explicitly reports "This is a risk assessment, not a medical diagnosis" in every response and in the UI. Risk scores use transparent, configurable rules and flagged demo calibration bands; they are designed to surface trends and inform human review, not to replace a clinician. The AI layer only explains deterministic results and never issues diagnoses. Always seek appropriate medical care in emergencies — the platform is a decision-support tool for trained staff.

## Screenshots

Screenshot gallery is in the [`Architecture/`](Architecture) directory (system diagrams) — UI captures can be added by running the platform locally and saving from the browser.

## Team

Built for the HackDevengers 2.0 hackathon.

## License

See [LICENSE](LICENSE).
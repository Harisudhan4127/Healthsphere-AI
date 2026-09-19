# HealthSphere AI — Architecture

## Overview

HealthSphere AI is a **modular monolith** designed to grow into a distributed healthcare platform. It combines deterministic risk intelligence with an optional LLM explanation layer, all arranged so the core risk computation never depends on an external model.

## Layers

### 1. Frontend (React SPA)

- **Build**: Vite + TypeScript. Route-based code splitting (each page is a lazy chunk).
- **Data layer**: TanStack Query server-state caching with JWT authentication stored in `localStorage` (`src/services/api.ts`).
- **Design system**: shared primitives in `src/components` — badges, risk gauge, stat cards, loading/empty/error states, page headers.
- **Proxying**: dev server proxies `/api` → `http://localhost:8000` (`vite.config.ts`); prod Nginx `frontend/nginx.conf` proxies `/api` to the backend service.

### 2. Backend (FastAPI)

Routers in `app/api` delegate to services in `app/services`:

| Request → | Router (`app/api`) | Service (`app/services`) | Intelligence |
|---|---|---|---|
| `/auth` | `auth.py` | auth logic | — |
| `/patients` | `patients.py` | patients | — |
| health | `health.py` | `health/service.py` | — |
| disease | `disease.py` | `disease/service.py` | explainability |
| medication | `medication.py` | `medication/service.py` | breach rules |
| `/emergencies` | `emergency.py` | `emergency/service.py` | state machine |
| `/risk` | `risk.py` | risk | `intelligence/risk_engine.py` |
| `/alerts` | `alerts.py` | `alerts/service.py` | routing/bucketing |
| `/dashboard`, `/analytics` | `dashboard.py`, `analytics.py` | aggregations | insight generator |

### 3. Intelligence layer (`app/intelligence`)

**Risk engine (`risk_engine.py`)** — the single source of truth for risk:

```
score = max(0, min(100, Σ(weightᵢ × factorᵢ)))
level = LOW(0–24) | MODERATE(25–49) | ELEVATED(50–74) | HIGH(75–100)
```

Six factors — Health Metrics, Reported Symptoms, Disease Risk Indicators, Medication Status, Emergency Status, Health Trend — each weighted and each producing a human-readable detail list. The result includes a per-factor contribution (`name`, `impact`, `contribution`, `weight`, `details`) that the UI renders as `FactorBars`.

**Explainability (`explainability.py`)** — converts the structured factor breakdown into a deterministic prose explanation. No LLM dependency.

**Recommendations (`recommendations.py`)** — level- and factor-appropriate action suggestions.

### 4. Integration layer (`app/integrations`)

`ai_provider.py` exposes an `AIClient` that calls an OpenAI-compatible `/chat/completions` endpoint via `httpx`. When `AI_API_KEY` is unset or the call fails, it returns the deterministic explanation. **The LLM narrates; it never computes risk.**

### 5. Data layer

- SQLAlchemy 2 models in `app/models/models.py` (12 tables).
- Alembic migrations in `migrations/versions`.
- SQLite for dev (`sqlite:///./healthsphere.db`); PostgreSQL via `DATABASE_URL`.
- `datetime.utcnow`-based timestamps; UUID string primary keys; JSON columns for flexible factor payloads.

## Security model

- **Auth**: JWT (HS256) with bcrypt-hashed passwords; `get_current_user` dependency.
- **RBAC**: `require_roles(...)` guard; Admin > Clinician > Emergency Responder > User.
- **Audit**: `app/core/audit.py` writes to `audit_logs` for sensitive actions (sign-ins, deletes, status changes).
- **Transport**: CORS allowlist from settings; security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); request-ID correlation.
- **Secrets**: never committed; `.env` gitignored; CI job scans history for credentials.

## Emergency lifecycle (state machine)

```
DETECTED → VERIFYING → ALERTED → RESPONDING → RESOLVED
    └──────────────────────┴────────────────────────────→
```

Transitions are validated against `VALID_TRANSITIONS` in `app/services/emergency/service.py`; every state change appends a timestamped entry to the event's `timeline` and creates a bucketable alert.

## Data flow — risk recalculation

```
POST /patients/{id}/risk/recalculate
  → risk.service.recalculate
    → risk_engine.calculate_risk(patient, records, symptoms, assessments, medications, readings, emergencies)
    → persist RiskAssessment (score, level, factors JSON)
  → explainability.explain(...)   → explanation
  → recommendations.for_level(...)
  → audit log entry
```

## Deployment topology

- **Dev**: uvicorn on :8000, Vite dev on :5173, SQLite.
- **Containerized**: `docker compose up` → Nginx (:80) serving the SPA and reverse-proxying `/api` to uvicorn (:8000), Postgres (:5432) with a healthcheck-gated startup.
- **Cloud**: Vercel (SPA, `vercel.json` rewrite + security headers) + Render (`render.yaml` blueprint: web service + Postgres, auto `alembic upgrade head`).

## Scalability path

Current modular monolith → extract `app/services/*` packages into standalone services when load requires, using the existing REST schemas as service contracts; swap SQLite for Postgres (done via `DATABASE_URL`); add queueing for AI narration/analytics to keep the API latency-bound.
# HealthSphere AI — API Reference

All routes are under `https://<host>/api/v1`, JSON in/out, and require `Authorization: Bearer <JWT>` unless noted. Interactive docs: `GET /docs` (Swagger UI), `GET /openapi.json`.

## Response conventions

- Errors: `{"detail": "..."}` with appropriate status (400 validation/business, 401 unauthenticated, 403 forbidden role, 404 missing, 422 schema validation, 500 guarded).
- IDs are UUID strings. Dates are ISO-8601. Risk factors are JSON arrays/objects.
- Sensitive mutations are written to the `audit_logs` table.

## Roles

`ADMIN` (full access, can delete/archive), `CLINICIAN`, `EMERGENCY_RESPONDER`, `USER`. Guards compare the caller role against the endpoint's allowed set.

---

## Auth

### `POST /auth/register` — create account (first user becomes org ADMIN) · *public*
Body: `{ "name", "email", "password", "organization_name?" }`
Returns: `{ "access_token", "token_type", "user": {...} }` (201)

### `POST /auth/login` — obtain JWT · *public*
Body: `{ "email", "password" }` → `{ access_token, token_type, user }`

### `GET /auth/me` — current user profile
Returns the authenticated user (org, role).

### `GET /auth/roles` — available roles / access matrix

### `GET /auth/organization` — current organization (nullable)

---

## Patients

### `GET /patients?search=&status=` — list (search matches name; status filter enables `func.upper` comparison)
### `POST /patients` — create · Body: `{ "name", "date_of_birth?", "gender?", "blood_group?", "mobile?", "email?", "status?" }`
### `GET /patients/{id}` — detail
### `PUT /patients/{id}` — partial update (e.g. `{ "status": "ARCHIVED" }`)
### `DELETE /patients/{id}` — **ADMIN only**, 204

---

## Health monitoring

All under `/patients/{id}/…`

### `GET /health?limit=` — latest-first vitals
### `POST /health` — add record · Body: `{ "heart_rate?", "spo2?", "temperature?", "activity?", "sleep?" }` (validation: `60–220`, `70–100`, `34–42`, `0–24`, `0–24`)
### `GET /health/trends` — chronological (asc) records for trend charts
### `GET /health/summary` — `{ latest, average, trend }`
### `POST /symptoms` — Body: `{ "name", "severity"?: mild|moderate|high, "notes?" }`
### `GET /symptoms` — symptom history

---

## Disease risk (decision support)

### `POST /patients/{id}/disease-assessment` — Body: `{ "assessment_type", "biomarker_observations"?, "symptom_indicators"?, "age_group"?, "risk_factors"? }`
Returns: `{ "message", "assessment": { risk_level, score }, "explanation", "recommendations", "disclaimer", "record_id" }`.
Every response carries **`disclaimer`: "This is a risk assessment, not a medical diagnosis."**

### `GET /patients/{id}/disease-assessments` — history

---

## Medication

### `GET /patients/{id}/medications` — list
### `POST /patients/{id}/medications` — Body: `{ "name", "storage_requirements": { "min_temp?", "max_temp?", "max_duration_hours?", "label?" } }`
### `POST /medications/{id}/readings` — Body: `{ "temperature"?, "duration_hours"? }` → status `SAFE|WARNING|HIGH`; breaches create `MEDICATION` alerts
### `GET /medications/{id}/status` — live safety status aggregating all readings

---

## Emergency

### `GET /emergencies?status=` — list (status filter uppercased server-side)
### `POST /emergencies` — Body: `{ "patient_id", "event_type"?, "severity"? HIGH|CRITICAL|LOW, "description"? }` → `DETECTED`, creates `EMERGENCY` alert
### `GET /emergencies/{id}` — detail incl. `timeline`
### `PUT /emergencies/{id}/status` — Body: `{ "status" }`

**Lifecycle** (validated): `DETECTED → VERIFYING → ALERTED → RESPONDING → RESOLVED`; any other transition is ignored (idempotent), and each accepted change appends to `timeline`.

---

## Risk

### `GET /patients/{id}/risk` — most recent assessment
### `POST /patients/{id}/risk/recalculate` — re-run engine
Returns: `{ "score", "level", "factors": [{ name, impact, contribution, weight, details }], "explanation", "recommendations", "calculated_at" }`
Bands (configurable via env): LOW ≤24 · MODERATE ≤49 · ELEVATED ≤74 · HIGH ≤100.
### `GET /patients/{id}/risk/recommendations` — current guidance

---

## Alerts

### `GET /alerts?severity=&status=` — aggregate centre (severity/status filters use case-insensitive comparison)
### `PUT /alerts/{id}/status` — resolves/suppresses `{ "status": "RESOLVED" }`

---

## Dashboard & analytics

### `GET /dashboard/summary` — `{ total_patients, active_emergencies, active_alerts, high_risk_count, risk_distribution, recent_activity?, ai_insight }`
### `GET /analytics` — `{ risk_trend, patient_statistics, alert_trend, medication_safety, emergency_events }`

---

## Settings

### `GET /settings` — module toggles + org settings
`"modules": { "health_monitoring", "disease_risk", "medication", "emergency", "alerts" }` plus org config (risk thresholds, notification prefs).

---

## System

### `GET /health` — `{ "status": "ok" }` (no auth)
### `GET /docs`, `GET /openapi.json`

---

## Examples

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@healthsphere.ai","password":"admin123"}' | jq -r .access_token)

# Create a patient, then recalculate risk
PID=$(curl -s -X POST http://localhost:8000/api/v1/patients \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Ramesh","gender":"male"}' | jq -r .id)

curl -s -X POST http://localhost:8000/api/v1/patients/$PID/risk/recalculate \
  -H "Authorization: Bearer $TOKEN" | jq .level
```
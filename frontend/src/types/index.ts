export type Role = 'ADMIN' | 'CLINICIAN' | 'USER' | 'EMERGENCY_OPERATOR'

export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  organization_id: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Patient {
  id: string
  name: string
  date_of_birth: string | null
  gender: string | null
  contact: string | null
  status: string
  organization_id: string | null
  age: number | null
  risk_score: number | null
  risk_level: RiskLevel | null
  created_at: string
  updated_at: string
}

export interface HealthRecord {
  id: string
  patient_id: string
  heart_rate: number | null
  spo2: number | null
  temperature: number | null
  activity: number | null
  sleep: number | null
  recorded_at: string
}

export interface Symptom {
  id: string
  patient_id: string
  name: string
  severity: string
  notes: string | null
  reported_at: string
}

export interface RiskResult {
  patient_id?: string
  score: number
  level: RiskLevel
  factors: RiskFactor[]
  explanation?: string
  created_at?: string
}

export interface RiskFactor {
  name: string
  impact: string
  contribution?: number
  weight?: number
  details?: Array<{ name?: string; contribution?: number; detail?: string }>
}

export interface DiseaseAssessment {
  id: string
  patient_id: string
  assessment_type: string
  risk_score: number
  risk_level: RiskLevel
  factors: Array<{ name: string; impact: string; contribution?: number }>
  followup?: string | null
  created_at: string
  explanation?: string
  disclaimer?: string
}

export interface Medication {
  id: string
  patient_id: string
  name: string
  storage_requirements: {
    min_temp?: number
    max_temp?: number
    max_duration_hours?: number
    label?: string
  }
  status: string
  created_at: string
  updated_at: string
}

export interface MedicationReading {
  id: string
  medication_id: string
  temperature: number | null
  duration: number | null
  status: string
  recorded_at: string
}

export interface MedicationStatus {
  medication: Medication
  status: string
  condition: string
  last_check: string | null
  readings: MedicationReading[]
}

export interface EmergencyEvent {
  id: string
  patient_id: string
  patient_name?: string | null
  event_type: string
  severity: string
  latitude?: number | null
  longitude?: number | null
  status: string
  detected_at: string
  verified_at?: string | null
  alerted_at?: string | null
  responding_at?: string | null
  resolved_at?: string | null
  timeline: Array<{ time: string; label: string }>
}

export interface Alert {
  id: string
  patient_id: string | null
  patient_name?: string | null
  type: string
  severity: string
  message: string
  status: string
  created_at: string
}

export interface DashboardSummary {
  total_patients: number
  active_alerts: number
  risk_distribution: Record<RiskLevel, number>
  average_risk: number
  active_emergencies: number
  medication_alerts: number
  recent_alerts: Alert[]
  ai_insight: string
  generated_at: string
}

export interface Analytics {
  risk_trend: Array<{ date: string; score: number }>
  patient_statistics: {
    total: number
    gender: Record<string, number>
    medications: number
    assessments: number
  }
  alert_trend: Array<{ date: string; ACTIVE: number; RESOLVED: number; total: number }>
  medication_safety: {
    medications: number
    readings: number
    out_of_range: number
    safe_percent: number
  }
  emergency_events: Array<{
    id: string
    type: string
    severity: string
    status: string
    patient_name?: string | null
    detected_at: string
  }>
}

export interface Modules {
  health_monitoring: boolean
  disease_risk: boolean
  medication_safety: boolean
  emergency_response: boolean
  advanced_analytics: boolean
}

export interface Settings {
  organization: { id: string; name: string; type: string; settings: Record<string, unknown> } | null
  modules: Modules
  risk_config: { low_max: number; moderate_max: number; elevated_max: number }
}
export type ScanStatus =
  | 'pending'
  | 'collecting'
  | 'processing'
  | 'awaiting_llm_input'
  | 'parsing'
  | 'completed'
  | 'failed'

export interface Scan {
  id: string
  status: ScanStatus
  config: Record<string, unknown>
  prompt_text?: string
  prompt_tokens_est?: number
  llm_response_raw?: string
  llm_used?: string
  started_at?: string
  processed_at?: string
  submitted_at?: string
  completed_at?: string
  error_message?: string
  created: string
  updated: string
}

export interface Scoring {
  pain_intensity: number
  trend_momentum: number
  competition_gap: number
  mvp_feasibility: number
}

export type OpportunityStatus =
  | 'new'
  | 'evaluating'
  | 'discarded'
  | 'building'
  | 'archived'

export interface Opportunity {
  id: string
  scan: string
  rank?: number
  score?: number
  name?: string
  problem?: string
  evidence?: string | string[]
  scoring?: Scoring
  target_user?: string
  mvp_features?: string[]
  monetization?: string
  build_time?: string
  reasoning?: string
  user_status: OpportunityStatus
  notes?: string
  created: string
  updated: string
}

export interface ParseError {
  kind: 'no_json' | 'invalid_json' | 'schema_error' | 'empty'
  message: string
  hint: string
}

// ── Settings ────────────────────────────────────────────────────────────────

export type SourceStatus = 'ready' | 'configured' | 'not_configured' | 'error'

export interface SourceInfo {
  name: string
  status: SourceStatus
  method: string
  config: Record<string, unknown>
}

export interface EnvVarInfo {
  set?: boolean
  value?: string | number | boolean
  default?: string | number | boolean
  required?: boolean
  description: string
  hint?: string
}

export interface SettingsStatus {
  sources: Record<string, SourceInfo>
  env_vars: Record<string, EnvVarInfo>
  instructions: {
    how_to_update: string
    note: string
  }
}

// ── Scan Configs ─────────────────────────────────────────────────────────────

export interface ScanConfig {
  id: string
  name: string
  config: Record<string, unknown>
  is_default: boolean
  created: string
  updated: string
}

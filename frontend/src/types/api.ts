export interface UserResponse {
  id: string
  email: string
  created_at: string
}

export type EngagementStatus = 'lead' | 'coaching' | 'short-term' | 'fixed-term' | 'hourly'

export interface ClientResponse {
  id: string
  user_id: string
  name: string
  description: string | null
  market_type: string | null
  assumed_problem: string | null
  assumed_solution: string | null
  assumed_market: string | null
  initial_notes: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  engagement_status: EngagementStatus | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface ClientCreate {
  name: string
  description?: string
  market_type?: string
  assumed_problem?: string
  assumed_solution?: string
  assumed_market?: string
  initial_notes?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  engagement_status?: EngagementStatus
}

export interface ClientNoteResponse {
  id: string
  client_id: string
  content: string
  created_at: string
}

export type ClientUpdate = Partial<ClientCreate>

/** Strength of support for problem-validation (Epic 2/3). */
export type StrengthOfSupport = 'strong' | 'emerging' | 'weak'

export interface ProjectResponse {
  id: string
  client_id: string
  name: string
  objective: 'problem-validation' | 'positioning' | 'persona-buildout' | 'icp-refinement'
  target_segments: string[]
  assumed_problem?: string | null
  /** Truncated for quick view (e.g. first 80 chars). */
  assumed_problem_truncated?: string | null
  status: 'active' | 'archived'
  confidence_score: number | null
  /** From latest problem-validation analysis (Epic 2/3). */
  strength_of_support?: StrengthOfSupport | null
  /** Epic 3: up to 2 supporting quotes from latest problem-validation analysis. */
  supporting_quotes?: { text: string; citation: string | null }[]
  /** Epic 3: one contradicting quote from latest problem-validation analysis. */
  contradicting_quote?: { text: string; citation: string | null } | null
  last_analyzed_at: string | null
  total_cost_usd?: number | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface ProjectCreate {
  name: string
  objective: 'problem-validation' | 'positioning' | 'persona-buildout' | 'icp-refinement'
  target_segments?: string[]
  assumed_problem?: string | null
}

export type ProjectUpdate = Partial<ProjectCreate>

export interface DataSourceResponse {
  id: string
  project_id: string
  source_type: 'file' | 'paste'
  file_name: string
  file_path: string | null
  content_type: string | null
  collected_date: string | null
  creator_name: string | null
  purpose: string | null
  created_at: string
}

export interface DataSourcePreviewResponse {
  id: string
  file_name: string
  raw_text_preview: string
}

export interface DataSourcePasteCreate {
  raw_text: string
  file_name?: string
  collected_date?: string
  creator_name?: string
  purpose?: string
}

// Onboarding
export interface OnboardingThemeItem {
  text: string
  frequency: number
}

export interface OnboardingSummaryResponse {
  themes: OnboardingThemeItem[]
  interest_points: string[]
  gaps: string[]
  summary: string
  confidence_score: number | null
}

// Analysis (Stories 4-1, 4-2, 4-3)
export type InsightType = 'finding' | 'contradiction' | 'gap'

export interface InsightResponse {
  id: string
  type: InsightType
  text: string
  citation: string | null
  confidence: number | null
  source_count: number
}

// Story 5-1: positioning discovery result
export interface PositioningValueDriver {
  text: string
  frequency_count: number
}

export interface PositioningResultResponse {
  value_drivers: PositioningValueDriver[]
  alternative_angles: string[]
  recommended_interviews: string[]
  confidence_score: number | null
}

// Story 6-1: next-step recommendations
export interface RecommendationsResponse {
  action_items: string[]
  interview_script_md: string | null
  survey_template_md: string | null
  can_create_next_project: boolean
  suggested_next_objective: string | null
}

export interface AnalysisResponse {
  id: string
  project_id: string
  objective: string
  confidence_score: number | null
  /** Problem-validation: strong | emerging | weak (Epic 2/3). */
  strength_of_support?: StrengthOfSupport | null
  tokens_used: number | null
  cost_usd: number | null
  insights: InsightResponse[]
  positioning_result?: PositioningResultResponse | null
  onboarding_result?: OnboardingSummaryResponse | null
  recommendations?: RecommendationsResponse | null
  created_at: string
}

// Story 5-2: persona card
export const PERSONA_FIELD_LABELS: Record<string, string> = {
  name_title: 'Name / Title',
  goals: 'Goals',
  pain_points: 'Pain Points',
  decision_drivers: 'Decision Drivers',
  false_beliefs: 'False Beliefs',
  job_to_be_done: 'Job to Be Done',
  usage_patterns: 'Usage Patterns',
  objections: 'Objections',
  success_metrics: 'Success Metrics',
}

export type FieldQuality = 'low' | 'medium' | 'high'

export interface PersonaResponse {
  id: string
  project_id: string
  confidence_score: number | null
  name_title: string | null
  goals: string | null
  pain_points: string | null
  decision_drivers: string | null
  false_beliefs: string | null
  job_to_be_done: string | null
  usage_patterns: string | null
  objections: string | null
  success_metrics: string | null
  field_quality: Record<string, FieldQuality> | null
  completion_pct: number
  staleness_decay_pct: number
  last_analyzed_at: string | null
  created_at: string
  updated_at: string
}

// Story 5-3: ICP card
export const ICP_DIMENSION_LABELS: Record<string, string> = {
  company_size: 'Company Size',
  industries: 'Industries',
  geography: 'Geography',
  revenue: 'Revenue',
  tech_stack: 'Tech Stack',
  use_case_fit: 'Use Case Fit',
  buying_process: 'Buying Process',
  budget: 'Budget',
  maturity: 'Maturity',
  custom: 'Custom',
}

export interface IcpResponse {
  id: string
  project_id: string
  confidence_score: number | null
  company_size: string | null
  industries: string | null
  geography: string | null
  revenue: string | null
  tech_stack: string | null
  use_case_fit: string | null
  buying_process: string | null
  budget: string | null
  maturity: string | null
  custom: string | null
  dimension_confidence: Record<string, FieldQuality> | null
  last_analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type ConfidenceState = 'none' | 'red' | 'amber' | 'green'

export function getConfidenceState(score: number | null): ConfidenceState {
  if (score === null) return 'none'
  if (score < 0.5) return 'red'
  if (score < 0.75) return 'amber'
  return 'green'
}

export interface PromptTemplateResponse {
  analysis_type: string
  system_prompt: string
  updated_at: string
}

export interface LLMSettingsResponse {
  model: string
  timeout_seconds: number
  api_key_masked: string | null
  api_key_is_set: boolean
}

export interface PromptUpdate {
  system_prompt: string
}

export interface LLMSettingsUpdate {
  model?: string
  timeout_seconds?: number
  api_key?: string
}
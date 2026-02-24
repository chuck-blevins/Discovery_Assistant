export interface UserResponse {
  id: string
  email: string
  created_at: string
}

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
}

export type ClientUpdate = Partial<ClientCreate>

export interface ProjectResponse {
  id: string
  client_id: string
  name: string
  objective: 'problem-validation' | 'positioning' | 'persona-buildout' | 'icp-refinement'
  target_segments: string[]
  status: 'active' | 'archived'
  confidence_score: number | null
  last_analyzed_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface ProjectCreate {
  name: string
  objective: 'problem-validation' | 'positioning' | 'persona-buildout' | 'icp-refinement'
  target_segments?: string[]
}

export type ProjectUpdate = Partial<ProjectCreate>

export type ConfidenceState = 'none' | 'red' | 'amber' | 'green'

export function getConfidenceState(score: number | null): ConfidenceState {
  if (score === null) return 'none'
  if (score < 0.5) return 'red'
  if (score < 0.75) return 'amber'
  return 'green'
}

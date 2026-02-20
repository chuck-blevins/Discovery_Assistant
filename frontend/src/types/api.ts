export interface UserResponse {
  id: string
  email: string
  created_at: string
}

export interface ClientResponse {
  id: string
  user_id: string
  name: string
  market_type: string | null
  problem_statement: string | null
  solution_description: string | null
  market_notes: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

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
}

export type ConfidenceState = 'none' | 'red' | 'amber' | 'green'

export function getConfidenceState(score: number | null): ConfidenceState {
  if (score === null) return 'none'
  if (score < 0.5) return 'red'
  if (score < 0.75) return 'amber'
  return 'green'
}

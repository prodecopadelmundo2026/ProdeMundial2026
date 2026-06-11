export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'
export type MatchStatus = 'upcoming' | 'live' | 'finished'

export type Match = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  scheduled_at: string
  locked_at: string
  stage: MatchStage
  group: string | null
  status: MatchStatus
  created_at: string
}

export type Prediction = {
  id: string
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  tiebreaker_team?: string | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type RankingEntry = {
  user_id: string | null
  name: string
  avatar_url: string | null
  total_points: number
  exact_predictions: number
  correct_result_predictions: number
  incorrect_predictions?: number
  predictions_count?: number
  loaded_count?: number
  expected_count?: number
  progress_percentage?: number
  missing_sections?: string[]
  prode_status?: 'empty' | 'not_started' | 'in_progress' | 'almost_done' | 'complete' | 'completed'
  participant_status?: 'confirmed' | 'trial'
  rank: number
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour TypeScript
export type Profile = {
  id: string
  username: string
  created_at: string
}

export type GameInvitation = {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  from_user?: Profile
  game_config?: string // JSON stringifié de GameConfig
}

export type Game = {
  id: string
  player_white_id: string
  player_black_id: string
  current_turn: 'blanc' | 'noir'
  board_state: string // JSON stringifié
  captured_bloks_white: number
  captured_bloks_black: number
  last_turn_player: 'blanc' | 'noir' | null
  winner: 'blanc' | 'noir' | null
  status: 'waiting' | 'active' | 'finished'
  created_at: string
  updated_at: string
  player_white?: Profile
  player_black?: Profile
  game_config?: string // JSON stringifié de GameConfig
}

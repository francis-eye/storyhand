export type Role = 'host' | 'player' | 'observer'
export type GamePhase = 'waiting' | 'voting' | 'countdown' | 'revealed'
export type VotingSystem = 'fibonacci'
export type CardValue = number | '?' | '☕'

export interface Player {
  id: string
  name: string
  role: Role
  vote?: CardValue
  hasVoted: boolean
  isConnected: boolean
  disconnectedAt?: number
}

export interface GameSettings {
  gameName: string
  votingSystem: VotingSystem
  showAverage: boolean
  showCountdown: boolean
  inactivityTimeout: number
}

export interface GameState {
  sessionId: string
  settings: GameSettings
  phase: GamePhase
  players: Player[]
  currentRound: number
  hostId: string
}

export const FIBONACCI_DECK: readonly CardValue[] = [
  0,
  1,
  2,
  3,
  5,
  8,
  13,
  21,
  34,
  55,
  89,
  '?',
  '☕',
]

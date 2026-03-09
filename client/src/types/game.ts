// User roles in a session
export type Role = 'host' | 'player' | 'observer';

// Phases of a voting round
export type GamePhase = 'waiting' | 'voting' | 'countdown' | 'revealed';

// Card values: numeric Fibonacci values plus special cards
export type CardValue = number | '?' | '☕';

// A participant in the session
export interface Player {
  id: string;
  name: string;
  role: Role;
  vote: CardValue | null;
  hasVoted: boolean;
  isConnected: boolean;
  disconnectedAt: number | null;
}

// Configuration set when creating a game
export interface GameSettings {
  gameName: string;
  votingSystem: string;
  showAverage: boolean;
  showCountdown: boolean;
  inactivityTimeout: number; // minutes
}

// Full state of an active session
export interface GameState {
  sessionId: string;
  settings: GameSettings;
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  hostId: string;
  isReVoting: boolean;
  countdownValue: number | null;
}

// The 13-card Fibonacci deck
export const FIBONACCI_DECK: readonly CardValue[] = [
  0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕',
] as const;

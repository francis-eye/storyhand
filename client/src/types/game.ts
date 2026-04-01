// User roles in a session
export type Role = 'facilitator' | 'player' | 'observer';

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

// Available table themes
export type TableTheme = 'classic' | '16bit';

// Configuration set when creating a game
export interface GameSettings {
  gameName: string;
  votingSystem: string;
  showAverage: boolean;
  showCountdown: boolean;
  inactivityTimeout: number; // minutes
  tableTheme: TableTheme;
}

// Achievement earned during a round
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  playerId?: string;
}

// Summary shown when a session ends
export interface SessionSummary {
  gameName: string;
  totalRounds: number;
  durationMinutes: number;
  playerCount: number;
  consensusRate: number;
  bestStreak: number;
  mvps: {
    mostAchievements?: { name: string; count: number } | null;
    mostAccurate?: { name: string; count: number; total: number } | null;
    mostAfk?: { name: string; count: number } | null;
    fastestVoter?: { name: string; count: number } | null;
  };
}

// Full state of an active session
export interface GameState {
  sessionId: string;
  settings: GameSettings;
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  facilitatorId: string;
  isReVoting: boolean;
  countdownValue: number | null;
  consensusStreak: number;
}

// The 13-card Fibonacci deck
export const FIBONACCI_DECK: readonly CardValue[] = [
  0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕',
] as const;

// Check if a player can vote (facilitator and player roles)
export function canVote(player: { role: string }): boolean {
  return player.role === 'facilitator' || player.role === 'player';
}

// ── Dual Storage (sessionStorage + localStorage fallback) ─────────────────────
// Safari clears sessionStorage on tab close. localStorage with TTL provides
// a fallback so players can reconnect after reopening the tab.

const SESSION_KEY = 'storyhand_session';
const TTL_MS = 300000; // 5 minutes — matches disconnect grace period

interface StoredSession {
  sessionId: string;
  playerId: string;
  timestamp: number;
}

/**
 * Read stored session identity.
 * Checks sessionStorage first (works on Chrome tab restore).
 * Falls back to localStorage with TTL check (covers Safari tab close).
 */
export function getStoredSession(): StoredSession | null {
  try {
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) {
      return JSON.parse(fromSession);
    }

    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) {
      const data: StoredSession = JSON.parse(fromLocal);
      if (Date.now() - data.timestamp < TTL_MS) {
        // Valid — also restore to sessionStorage for subsequent checks
        sessionStorage.setItem(SESSION_KEY, fromLocal);
        return data;
      }
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

/**
 * Store session identity in both storage mechanisms.
 * Call after successful create-session or join-session.
 */
export function storeSession(sessionId: string, playerId: string): void {
  const data = JSON.stringify({ sessionId, playerId, timestamp: Date.now() });
  sessionStorage.setItem(SESSION_KEY, data);
  localStorage.setItem(SESSION_KEY, data);
}

/**
 * Refresh the timestamp to prevent TTL expiry during active sessions.
 * Call on meaningful interactions (play card, new round, etc.).
 */
export function refreshSessionTimestamp(): void {
  try {
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) {
      const data: StoredSession = JSON.parse(fromSession);
      data.timestamp = Date.now();
      const updated = JSON.stringify(data);
      sessionStorage.setItem(SESSION_KEY, updated);
      localStorage.setItem(SESSION_KEY, updated);
    }
  } catch {
    // Non-critical
  }
}

/**
 * Clear session identity from both storage mechanisms.
 * Call on explicit leave/exit AND on failed reconnect.
 */
export function clearStoredSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

// Generate a 6-character alphanumeric session ID
export function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random player ID
export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Calculate the average of numeric votes (excludes ? and ☕)
export function calculateAverage(votes: (number | '?' | '☕' | null)[]): number | null {
  const numericVotes = votes.filter((v): v is number => typeof v === 'number');
  if (numericVotes.length === 0) return null;
  const sum = numericVotes.reduce((a, b) => a + b, 0);
  return Math.round((sum / numericVotes.length) * 10) / 10;
}

// Check if all numeric votes are the same
export function checkConsensus(votes: (number | '?' | '☕' | null)[]): boolean {
  const numericVotes = votes.filter((v): v is number => typeof v === 'number');
  if (numericVotes.length < 2) return false;
  return numericVotes.every((v) => v === numericVotes[0]);
}

// Color mapping for card point values (green-to-red effort gradient)
const CARD_COLORS: Record<string, string> = {
  '0': '#2E7D32',
  '1': '#388E3C',
  '2': '#558B2F',
  '3': '#9E9D24',
  '5': '#F57F17',
  '8': '#E65100',
  '13': '#D84315',
  '21': '#C62828',
  '34': '#AD1457',
  '55': '#7B1FA2',
  '89': '#4A148C',
  '?': '#37474F',
  '☕': '#4E342E',
};

// Lighter variants for dark card faces
const CARD_COLORS_DARK: Record<string, string> = {
  '0': '#66BB6A',
  '1': '#81C784',
  '2': '#9CCC65',
  '3': '#D4E157',
  '5': '#FFEE58',
  '8': '#FFA726',
  '13': '#FF7043',
  '21': '#EF5350',
  '34': '#EC407A',
  '55': '#AB47BC',
  '89': '#7E57C2',
  '?': '#90A4AE',
  '☕': '#A1887F',
};

export function getCardColor(value: number | '?' | '☕', isDark = false): string {
  const colors = isDark ? CARD_COLORS_DARK : CARD_COLORS;
  return colors[String(value)] || '#374151';
}

// Generate a deterministic color from a string (for avatar backgrounds)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

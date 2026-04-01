// Check if a player can vote (host and player roles)
export function canVote(player: { role: string }): boolean {
  return player.role === 'facilitator' || player.role === 'player';
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

export function getCardColor(value: number | '?' | '☕'): string {
  return CARD_COLORS[String(value)] || '#374151';
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

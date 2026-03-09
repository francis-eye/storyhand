import { useState } from 'react';
import type { GamePhase } from '../types/game';

interface SessionHeaderProps {
  gameName: string;
  sessionId: string;
  currentRound: number;
  phase: GamePhase;
  isReVoting?: boolean;
}

const phaseConfig: Record<GamePhase, { label: string; color: string }> = {
  waiting: { label: 'Waiting', color: 'bg-gray-200 text-gray-700' },
  voting: { label: 'Voting', color: 'bg-blue-100 text-blue-700' },
  countdown: { label: 'Countdown', color: 'bg-amber-100 text-amber-700' },
  revealed: { label: 'Revealed', color: 'bg-green-100 text-green-700' },
};

// Session info bar: game name, round counter, phase chip, session ID with copy
export default function SessionHeader({ gameName, sessionId, currentRound, phase, isReVoting }: SessionHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { label, color } = phaseConfig[phase];

  const copySessionId = async () => {
    await navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800">{gameName}</h2>
        <span className="text-sm text-gray-500">Round {currentRound}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          {label}
        </span>
        {isReVoting && phase === 'voting' && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
            Re-voting...
          </span>
        )}
      </div>
      <button
        onClick={copySessionId}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        title="Copy Session ID"
      >
        <span className="text-sm font-mono font-semibold text-gray-700">{sessionId}</span>
        <span className="text-xs text-gray-400">{copied ? '✓ Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}

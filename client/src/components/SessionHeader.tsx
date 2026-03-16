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

// Session info bar: game name, round counter, phase chip, invite link + session ID
export default function SessionHeader({ gameName, sessionId, currentRound, phase, isReVoting }: SessionHeaderProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const { label, color } = phaseConfig[phase];

  const inviteUrl = `${window.location.origin}/join/${sessionId}`;

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copySessionId = async () => {
    await navigator.clipboard.writeText(sessionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-6 py-2 md:py-3 bg-gray-50 border-b border-gray-200 gap-1 md:gap-0">
      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate max-w-[150px] md:max-w-none">{gameName}</h2>
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

      {/* Invite link + Session ID */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Primary: copy invite link — compact on mobile */}
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
          title="Copy invite link"
        >
          <span>{copiedLink ? '✓ Copied!' : <><span className="hidden md:inline">🔗 Copy Invite Link</span><span className="md:hidden">🔗 Invite</span></>}</span>
        </button>

        {/* Secondary: session ID with copy */}
        <button
          onClick={copySessionId}
          className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Copy Session ID"
        >
          <span className="text-xs md:text-sm font-mono font-semibold text-gray-700">{sessionId}</span>
          <span className="text-xs text-gray-400">{copiedId ? '✓' : '📋'}</span>
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { GamePhase } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';

interface SessionHeaderProps {
  gameName: string;
  sessionId: string;
  currentRound: number;
  phase: GamePhase;
  isReVoting?: boolean;
  theme: ThemeConfig;
}

// Session info bar: game name, round counter, phase chip, invite link + session ID
export default function SessionHeader({ gameName, sessionId, currentRound, phase, isReVoting, theme }: SessionHeaderProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const phaseClasses = theme.header.phaseChip[phase] || '';

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
    <div className={`flex items-center flex-wrap px-3 py-1.5 gap-x-2 gap-y-1 ${theme.header.background}`}>
      <h2 className={`text-base font-semibold truncate max-w-[150px] ${theme.header.gameName}`}>{gameName}</h2>

      <span className={`text-sm ${theme.header.roundText}`}>·</span>
      <span className={`text-sm ${theme.header.roundText}`}>Round {currentRound}</span>

      <span className={`text-sm ${theme.header.roundText}`}>·</span>
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${phaseClasses}`}>
        {phase.charAt(0).toUpperCase() + phase.slice(1)}
      </span>

      {isReVoting && phase === 'voting' && (
        <>
          <span className={`text-sm ${theme.header.roundText}`}>·</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium animate-pulse ${theme.header.reVotingChip}`}>
            Re-voting...
          </span>
        </>
      )}

      {/* Spacer pushes buttons to the right when there's room */}
      <span className="flex-1" />

      {/* Session ID with copy */}
      <button
        onClick={copySessionId}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${theme.header.sessionIdButton}`}
        title="Copy Session ID"
      >
        <span className={`text-xs font-mono font-semibold ${theme.header.sessionIdText}`}>{sessionId}</span>
        <span className="text-xs text-gray-400">{copiedId ? '✓' : '📋'}</span>
      </button>

      {/* Copy invite link */}
      <button
        onClick={copyInviteLink}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${theme.header.inviteButton}`}
        title="Copy invite link"
      >
        <span>{copiedLink ? '✓ Copied!' : '🔗 Invite'}</span>
      </button>
    </div>
  );
}

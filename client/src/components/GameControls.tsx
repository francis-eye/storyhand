import { useState, useEffect } from 'react';
import type { GamePhase } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';

interface GameControlsProps {
  phase: GamePhase;
  onReveal: () => void;
  onReVote: () => void;
  onNewRound: () => void;
  votedCount: number;
  totalPlayers: number;
  countdownValue?: number | null;
  unvotedPlayerNames: string[];
  theme: ThemeConfig;
}

export default function GameControls({
  phase,
  onReveal,
  onReVote,
  onNewRound,
  votedCount,
  totalPlayers,
  countdownValue,
  unvotedPlayerNames,
  theme,
}: GameControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // 3-second cooldown after reveal before buttons become active
  useEffect(() => {
    if (phase === 'revealed') {
      setCooldown(true);
      const timer = setTimeout(() => setCooldown(false), 3000);
      return () => clearTimeout(timer);
    }
    setCooldown(false);
  }, [phase]);

  // Reset confirm dialog when phase changes
  useEffect(() => {
    setShowConfirm(false);
  }, [phase]);

  return (
    <div className={`flex items-center justify-center gap-4 px-4 py-2.5 border-t border-gray-200 ${theme.gameControls.background}`}>
      {phase === 'voting' && (
        <>
          <span className={`text-sm ${theme.gameControls.voteCountText}`}>
            {votedCount}/{totalPlayers} voted
          </span>
          {votedCount > 0 && !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${theme.gameControls.buttonSecondary}`}
              title="Reveal cards early"
            >
              Reveal Now
            </button>
          )}
          {showConfirm && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${theme.gameControls.voteCountText}`}>
                Reveal with {votedCount}/{totalPlayers}?
                {unvotedPlayerNames.length > 0 && (
                  <> Missing: {unvotedPlayerNames.join(', ')}</>
                )}
              </span>
              <button
                onClick={() => setShowConfirm(false)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${theme.gameControls.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); onReveal(); }}
                className={`px-3 py-1 text-xs font-medium transition-colors ${theme.gameControls.buttonPrimary}`}
              >
                Reveal
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'countdown' && (
        <span className={`text-sm animate-pulse ${theme.gameControls.countdownText}`}>Revealing in {countdownValue ?? 3}...</span>
      )}

      {phase === 'revealed' && (
        <>
          <button
            onClick={onReVote}
            disabled={cooldown}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${cooldown ? 'opacity-50 cursor-not-allowed' : ''} ${theme.gameControls.buttonSecondary}`}
            title="Re-vote on the same item"
          >
            Re-Vote
          </button>
          <button
            onClick={onNewRound}
            disabled={cooldown}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${cooldown ? 'opacity-50 cursor-not-allowed' : ''} ${theme.gameControls.buttonPrimary}`}
            title="Start a new round for the next item"
          >
            New Round
          </button>
        </>
      )}
    </div>
  );
}

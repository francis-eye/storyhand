import type { GamePhase } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';

interface HostControlsProps {
  phase: GamePhase;
  onReveal: () => void;
  onReVote: () => void;
  onNewRound: () => void;
  votedCount: number;
  totalPlayers: number;
  countdownValue?: number | null;
  theme: ThemeConfig;
}

// Mobile: static full-width bar in content flow
// Desktop: floating dark pill (fixed position)
export default function HostControls({
  phase,
  onReveal,
  onReVote,
  onNewRound,
  votedCount,
  totalPlayers,
  countdownValue,
  theme,
}: HostControlsProps) {
  return (
    <div className={`rounded-none md:rounded-full px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-center gap-4 shadow-xl z-50 md:fixed md:bottom-28 md:left-1/2 md:-translate-x-1/2 ${theme.hostControls.background}`}>
      {phase === 'voting' && (
        <>
          <span className={`text-sm ${theme.hostControls.voteCountText}`}>
            {votedCount}/{totalPlayers} voted
          </span>
          <button
            onClick={onReveal}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${theme.hostControls.buttonPrimary}`}
            title="Reveal all cards"
          >
            Reveal Cards
          </button>
        </>
      )}

      {phase === 'countdown' && (
        <span className={`text-sm animate-pulse ${theme.hostControls.countdownText}`}>Revealing in {countdownValue ?? 3}...</span>
      )}

      {phase === 'revealed' && (
        <>
          <button
            onClick={onReVote}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${theme.hostControls.buttonSecondary}`}
            title="Re-vote on the same item"
          >
            Re-Vote
          </button>
          <button
            onClick={onNewRound}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${theme.hostControls.buttonPrimary}`}
            title="Start a new round for the next item"
          >
            New Round
          </button>
        </>
      )}
    </div>
  );
}

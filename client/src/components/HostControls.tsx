import type { GamePhase } from '../types/game';

interface HostControlsProps {
  phase: GamePhase;
  onReveal: () => void;
  onReVote: () => void;
  onNewRound: () => void;
  votedCount: number;
  totalPlayers: number;
  countdownValue?: number | null;
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
}: HostControlsProps) {
  return (
    <div className="bg-gray-900 text-white rounded-none md:rounded-full px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-center gap-4 shadow-xl z-50 md:fixed md:bottom-28 md:left-1/2 md:-translate-x-1/2">
      {phase === 'voting' && (
        <>
          <span className="text-sm text-gray-400">
            {votedCount}/{totalPlayers} voted
          </span>
          <button
            onClick={onReveal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            title="Reveal all cards"
          >
            Reveal Cards
          </button>
        </>
      )}

      {phase === 'countdown' && (
        <span className="text-sm animate-pulse">Revealing in {countdownValue ?? 3}...</span>
      )}

      {phase === 'revealed' && (
        <>
          <button
            onClick={onReVote}
            className="border border-gray-500 hover:border-gray-300 text-gray-300 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            title="Re-vote on the same item"
          >
            Re-Vote
          </button>
          <button
            onClick={onNewRound}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            title="Start a new round for the next item"
          >
            New Round
          </button>
        </>
      )}
    </div>
  );
}

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

// Floating dark pill with context-aware buttons
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
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full px-6 py-3 flex items-center gap-4 shadow-xl z-50">
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

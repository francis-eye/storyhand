import type { Player, GamePhase } from '../types/game';
import PlayingCard from './PlayingCard';
import ResultsPanel from './ResultsPanel';
import { canVote } from '../utils/session';

interface GameTableProps {
  players: Player[];
  phase: GamePhase;
  showAverage: boolean;
  countdownValue?: number | null;
}

// Central game table showing voted cards and results overlay
export default function GameTable({ players, phase, showAverage, countdownValue }: GameTableProps) {
  const voters = players.filter(p => canVote(p));
  const votedPlayers = voters.filter(p => p.hasVoted);
  const isRevealed = phase === 'revealed';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
      {/* Vote counter */}
      <p className="text-sm text-gray-500">
        {votedPlayers.length} of {voters.length} players voted
      </p>

      {/* Poker table */}
      <div className="relative bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl min-h-[280px] w-full max-w-2xl flex items-center justify-center p-8 border border-emerald-200">
        {votedPlayers.length === 0 ? (
          <p className="text-emerald-400 text-sm">Waiting for votes...</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center">
            {votedPlayers.map((player, i) => {
              // Pseudo-random rotation for visual interest
              const rotation = ((i * 13 + 7) % 11) - 5;
              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-1"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <PlayingCard
                    value={player.vote!}
                    faceUp={isRevealed}
                    size="medium"
                  />
                  <span className="text-xs text-gray-600 font-medium mt-1">
                    {player.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Countdown overlay */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
            <span className="text-5xl font-bold text-white animate-bounce">{countdownValue ?? 3}</span>
          </div>
        )}
      </div>

      {/* Results panel shown after reveal */}
      {isRevealed && (
        <ResultsPanel players={players} showAverage={showAverage} />
      )}
    </div>
  );
}

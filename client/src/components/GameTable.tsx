import type { Player, GamePhase } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import PlayingCard from './PlayingCard';
import ResultsPanel from './ResultsPanel';
import { canVote } from '../utils/session';
import { useIsMobile } from '../hooks/useIsMobile';

interface GameTableProps {
  players: Player[];
  phase: GamePhase;
  showAverage: boolean;
  countdownValue?: number | null;
  theme: ThemeConfig;
}

// Central game table showing voted cards and results overlay
export default function GameTable({ players, phase, showAverage, countdownValue, theme }: GameTableProps) {
  const isMobile = useIsMobile();
  const voters = players.filter(p => canVote(p));
  const votedPlayers = voters.filter(p => p.hasVoted);
  const isRevealed = phase === 'revealed';

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4 h-full relative">
      {/* Vote counter */}
      <p className={`text-sm ${theme.table.voteCountText}`}>
        {votedPlayers.length} of {voters.length} players voted
      </p>

      {/* Poker table */}
      <div className={`relative min-h-[180px] md:min-h-[280px] w-full max-w-3xl flex items-center justify-center p-4 md:p-8 ${theme.table.background} ${theme.table.border} ${theme.table.scanlines ? 'theme-16bit-scanlines' : ''}`}>
        {votedPlayers.length === 0 ? (
          <p className={`text-sm ${theme.table.emptyText}`}>Waiting for votes...</p>
        ) : (
          <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
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
                    size={isMobile ? 'small' : 'medium'}
                    theme={theme}
                  />
                  <span className={`text-xs font-medium mt-1 ${theme.table.voteCountText}`}>
                    {player.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Countdown overlay */}
        {phase === 'countdown' && (
          <div className={`absolute inset-0 flex items-center justify-center ${theme.countdown.overlayBg} ${theme.table.border.includes('rounded') ? 'rounded-2xl' : ''}`}>
            <span className={`text-5xl font-bold animate-bounce ${theme.countdown.text}`}>{countdownValue ?? 3}</span>
          </div>
        )}
      </div>

      {/* Results panel shown after reveal */}
      {isRevealed && (
        <ResultsPanel players={players} showAverage={showAverage} theme={theme} />
      )}
    </div>
  );
}

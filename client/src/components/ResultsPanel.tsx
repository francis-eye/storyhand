import type { Player } from '../types/game';
import type { CardValue } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import { calculateAverage, checkConsensus, canVote, getCardColor } from '../utils/session';

interface ResultsPanelProps {
  players: Player[];
  showAverage: boolean;
  theme: ThemeConfig;
}

// Results overlay: average, consensus banner, vote distribution
export default function ResultsPanel({ players, showAverage, theme }: ResultsPanelProps) {
  const voters = players.filter(p => canVote(p) && p.hasVoted);
  const votes = voters.map(p => p.vote);
  const average = calculateAverage(votes);
  const consensus = checkConsensus(votes);

  // Count distribution of votes
  const distribution = new Map<string, number>();
  votes.forEach(v => {
    if (v === null) return;
    const key = String(v);
    distribution.set(key, (distribution.get(key) || 0) + 1);
  });
  const maxCount = Math.max(...distribution.values(), 1);

  // Check for high variance (spread > 3 positions in the fibonacci sequence)
  const numericVotes = votes.filter((v): v is number => typeof v === 'number');
  const hasHighVariance = numericVotes.length >= 2 &&
    Math.max(...numericVotes) / Math.max(Math.min(...numericVotes), 1) > 5;

  return (
    <div className={`rounded-xl p-6 max-w-sm w-full ${theme.results.background || 'bg-[var(--results-bg)] border border-[var(--results-border)]'}`}>
      {/* Consensus banner */}
      {consensus && (
        <div className={`border rounded-lg px-4 py-2 mb-4 text-center ${theme.results.consensusBg} ${theme.results.consensusBorder}`}>
          <span className={`font-semibold ${theme.results.consensusText}`}>Consensus reached!</span>
        </div>
      )}

      {/* High variance warning */}
      {hasHighVariance && !consensus && (
        <div className={`border rounded-lg px-4 py-2 mb-4 text-center ${theme.results.varianceBg} ${theme.results.varianceBorder}`}>
          <span className={`font-medium text-sm ${theme.results.varianceText}`}>High variance — consider discussing</span>
        </div>
      )}

      {/* Average */}
      {showAverage && average !== null && (
        <div className="text-center mb-4">
          <p className={`text-sm ${theme.results.averageLabel}`}>Average</p>
          <p className={`text-3xl font-bold ${theme.results.averageValue}`}>{average}</p>
        </div>
      )}

      {/* Vote count */}
      <p className={`text-sm text-center mb-3 ${theme.results.voteCountText}`}>
        {voters.length} vote{voters.length !== 1 ? 's' : ''}
      </p>

      {/* Distribution bar chart */}
      <div className="flex flex-col gap-2">
        {Array.from(distribution.entries())
          .sort((a, b) => {
            const aNum = Number(a[0]);
            const bNum = Number(b[0]);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            return 1;
          })
          .map(([value, count]) => (
            <div key={value} className="flex items-center gap-2">
              <span className="w-8 text-right text-sm font-medium" style={{ color: getCardColor(value as CardValue) }}>{value}</span>
              <div className={`flex-1 rounded-full h-5 overflow-hidden ${theme.results.barBg}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${theme.results.barFill}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className={`w-6 text-sm ${theme.results.barCount}`}>{count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

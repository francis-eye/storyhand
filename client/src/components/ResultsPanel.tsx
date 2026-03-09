import type { Player, CardValue } from '../types/game';
import { calculateAverage, checkConsensus } from '../utils/session';

interface ResultsPanelProps {
  players: Player[];
  showAverage: boolean;
}

// Results overlay: average, consensus banner, vote distribution
export default function ResultsPanel({ players, showAverage }: ResultsPanelProps) {
  const voters = players.filter(p => p.role === 'player' && p.hasVoted);
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
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
      {/* Consensus banner */}
      {consensus && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-center">
          <span className="text-green-700 font-semibold">Consensus reached!</span>
        </div>
      )}

      {/* High variance warning */}
      {hasHighVariance && !consensus && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-center">
          <span className="text-amber-700 font-medium text-sm">High variance — consider discussing</span>
        </div>
      )}

      {/* Average */}
      {showAverage && average !== null && (
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">Average</p>
          <p className="text-3xl font-bold text-gray-800">{average}</p>
        </div>
      )}

      {/* Vote count */}
      <p className="text-sm text-gray-500 text-center mb-3">
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
              <span className="w-8 text-right text-sm font-medium text-gray-600">{value}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-sm text-gray-500">{count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

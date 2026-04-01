import { useState } from 'react';
import type { SessionSummary } from '../types/game';

interface SessionSummaryCardProps {
  summary: SessionSummary;
  onDone: () => void;
}

export default function SessionSummaryCard({ summary, onDone }: SessionSummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const generateCopyText = () => {
    const lines = [
      `\u{1F0CF} Storyhand \u2014 ${summary.gameName}`,
      `${summary.totalRounds} rounds \u00B7 ${summary.durationMinutes} min \u00B7 ${summary.playerCount} players`,
      `\u2705 ${summary.consensusRate}% consensus rate \u00B7 \u{1F525} Best streak: ${summary.bestStreak}`,
    ];
    if (summary.mvps.mostAchievements) {
      lines.push(`\u26A1 Most achievements: ${summary.mvps.mostAchievements.name} (${summary.mvps.mostAchievements.count})`);
    }
    if (summary.mvps.mostAccurate) {
      lines.push(`\u{1F3AF} Most accurate: ${summary.mvps.mostAccurate.name} (${summary.mvps.mostAccurate.count}/${summary.mvps.mostAccurate.total} rounds)`);
    }
    if (summary.mvps.mostAfk) {
      lines.push(`\u2615 Most AFK: ${summary.mvps.mostAfk.name} (${summary.mvps.mostAfk.count})`);
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCopyText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--surface-elevated)] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-[var(--border-default)]">
        <h2 className="text-center text-xs font-bold tracking-widest text-[var(--text-muted)] mb-1 uppercase">
          Session Complete
        </h2>
        <h3 className="text-center text-xl font-black text-[var(--text-primary)] mb-6">
          {summary.gameName}
        </h3>

        {/* Key stats */}
        <div className="text-center text-sm text-[var(--text-secondary)] mb-6">
          {summary.totalRounds} rounds &middot; {summary.durationMinutes} min &middot; {summary.playerCount} players
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-[var(--text-primary)]">{summary.consensusRate}%</div>
            <div className="text-xs text-[var(--text-secondary)]">Consensus Rate</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-[var(--text-primary)]">{'\u{1F525}'} {summary.bestStreak}</div>
            <div className="text-xs text-[var(--text-secondary)]">Best Streak</div>
          </div>
        </div>

        {/* MVPs */}
        <div className="flex flex-col gap-3 mb-6">
          {summary.mvps.mostAchievements && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u26A1'}</span>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Most Achievements</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.mvps.mostAchievements.name} &mdash; {summary.mvps.mostAchievements.count} earned
                </div>
              </div>
            </div>
          )}
          {summary.mvps.mostAccurate && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u{1F3AF}'}</span>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Most Accurate</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.mvps.mostAccurate.name} &mdash; closest to average {summary.mvps.mostAccurate.count}/{summary.mvps.mostAccurate.total} rounds
                </div>
              </div>
            </div>
          )}
          {summary.mvps.mostAfk && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u2615'}</span>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Most AFK</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.mvps.mostAfk.name} &mdash; {summary.mvps.mostAfk.count} coffee breaks
                </div>
              </div>
            </div>
          )}
          {summary.mvps.fastestVoter && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u26A1'}</span>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Fastest Voter</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.mvps.fastestVoter.name} &mdash; first to vote {summary.mvps.fastestVoter.count} times
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 text-sm font-medium rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            {copied ? '\u2713 Copied!' : 'Copy Summary'}
          </button>
          <button
            onClick={onDone}
            className="w-full py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:shadow-lg"
            style={{ background: '#4f46e5' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

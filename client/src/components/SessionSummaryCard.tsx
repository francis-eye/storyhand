import { useState } from 'react';
import type { SessionSummary, TableTheme } from '../types/game';

interface SessionSummaryCardProps {
  summary: SessionSummary;
  /** Theme the session used — drives the arcade vs clean look. */
  themeId: TableTheme;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function SessionSummaryCard({ summary, themeId, onPlayAgain, onHome }: SessionSummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const arcade = themeId === '16bit';

  const generateCopyText = () => {
    const lines = [
      `\u{1F0CF} Storyhand — ${summary.gameName}`,
      `${summary.totalRounds} rounds · ${summary.durationMinutes} min · ${summary.playerCount} players`,
      `✅ ${summary.consensusRate}% consensus rate · \u{1F525} Best streak: ${summary.bestStreak}`,
    ];
    if (summary.mvps.mostAchievements) {
      lines.push(`⚡ Most achievements: ${summary.mvps.mostAchievements.name} (${summary.mvps.mostAchievements.count})`);
    }
    if (summary.mvps.mostAccurate) {
      lines.push(`\u{1F3AF} Most accurate: ${summary.mvps.mostAccurate.name} (${summary.mvps.mostAccurate.count}/${summary.mvps.mostAccurate.total} rounds)`);
    }
    if (summary.mvps.mostAfk) {
      lines.push(`☕ Most AFK: ${summary.mvps.mostAfk.name} (${summary.mvps.mostAfk.count})`);
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCopyText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Class tokens: arcade (16-bit) vs clean (classic). Arcade reuses the global
  // marketing/arcade CSS layer (index.css); clean keeps the original CSS-var look.
  const c = arcade
    ? {
        panel: 'pixel-panel p-8 max-w-md w-full',
        eyebrow: 'text-center font-pixel text-[10px] tracking-widest text-[#33ff33] theme-16bit-glow-green mb-2 uppercase',
        title: 'text-center font-pixel text-base text-[#f5e6c8] mb-6 leading-relaxed',
        meta: 'text-center font-pixel-body text-lg text-[#f5e6c8]/80 mb-6',
        statCard: 'bg-[#0d0d1a] border-2 border-[#33ff33]/30 p-4 text-center',
        statValue: 'font-pixel text-lg text-[#ffa500] theme-16bit-glow',
        statLabel: 'font-pixel text-[8px] uppercase tracking-wider text-[#33ff33]/80 mt-2',
        mvpTitle: 'font-pixel text-[10px] uppercase text-[#33ff33]',
        mvpDesc: 'font-pixel-body text-base text-[#f5e6c8]/80 leading-tight mt-1',
        copyBtn: 'w-full py-2 font-pixel text-[10px] uppercase tracking-wider text-[#33ff33]/70 hover:text-[#33ff33] border-2 border-[#33ff33]/30 hover:border-[#33ff33]/60 transition-colors',
      }
    : {
        panel: 'bg-[var(--surface-elevated)] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-[var(--border-default)]',
        eyebrow: 'text-center text-xs font-bold tracking-widest text-[var(--text-muted)] mb-1 uppercase',
        title: 'text-center text-xl font-black text-[var(--text-primary)] mb-6',
        meta: 'text-center text-sm text-[var(--text-secondary)] mb-6',
        statCard: 'bg-[var(--bg-tertiary)] rounded-xl p-4 text-center',
        statValue: 'text-2xl font-black text-[var(--text-primary)]',
        statLabel: 'text-xs text-[var(--text-secondary)]',
        mvpTitle: 'text-sm font-bold text-[var(--text-primary)]',
        mvpDesc: 'text-xs text-[var(--text-secondary)]',
        copyBtn: 'w-full py-2.5 text-sm font-medium rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors',
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={c.panel}>
        <h2 className={c.eyebrow}>Session Complete</h2>
        <h3 className={c.title}>{summary.gameName}</h3>

        {/* Key stats */}
        <div className={c.meta}>
          {summary.totalRounds} rounds &middot; {summary.durationMinutes} min &middot; {summary.playerCount} players
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={c.statCard}>
            <div className={c.statValue}>{summary.consensusRate}%</div>
            <div className={c.statLabel}>Consensus Rate</div>
          </div>
          <div className={c.statCard}>
            <div className={c.statValue}>{'\u{1F525}'} {summary.bestStreak}</div>
            <div className={c.statLabel}>Best Streak</div>
          </div>
        </div>

        {/* MVPs */}
        <div className="flex flex-col gap-3 mb-6">
          {summary.mvps.mostAchievements && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'⚡'}</span>
              <div>
                <div className={c.mvpTitle}>Most Achievements</div>
                <div className={c.mvpDesc}>
                  {summary.mvps.mostAchievements.name} &mdash; {summary.mvps.mostAchievements.count} earned
                </div>
              </div>
            </div>
          )}
          {summary.mvps.mostAccurate && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u{1F3AF}'}</span>
              <div>
                <div className={c.mvpTitle}>Most Accurate</div>
                <div className={c.mvpDesc}>
                  {summary.mvps.mostAccurate.name} &mdash; closest to average {summary.mvps.mostAccurate.count}/{summary.mvps.mostAccurate.total} rounds
                </div>
              </div>
            </div>
          )}
          {summary.mvps.mostAfk && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'☕'}</span>
              <div>
                <div className={c.mvpTitle}>Most AFK</div>
                <div className={c.mvpDesc}>
                  {summary.mvps.mostAfk.name} &mdash; {summary.mvps.mostAfk.count} coffee breaks
                </div>
              </div>
            </div>
          )}
          {summary.mvps.fastestVoter && (
            <div className="flex items-center gap-3">
              <span className="text-lg">{'⚡'}</span>
              <div>
                <div className={c.mvpTitle}>Fastest Voter</div>
                <div className={c.mvpDesc}>
                  {summary.mvps.fastestVoter.name} &mdash; first to vote {summary.mvps.fastestVoter.count} times
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={handleCopy} className={c.copyBtn}>
            {copied ? '✓ Copied!' : 'Copy Summary'}
          </button>
          {arcade ? (
            <>
              <button onClick={onPlayAgain} className="btn-pixel-primary w-full">Play Again</button>
              <button onClick={onHome} className="btn-pixel-secondary w-full">Home</button>
            </>
          ) : (
            <>
              <button
                onClick={onPlayAgain}
                className="w-full py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:shadow-lg"
                style={{ background: '#4f46e5' }}
              >
                Play Again
              </button>
              <button
                onClick={onHome}
                className="w-full py-2.5 text-sm font-medium rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

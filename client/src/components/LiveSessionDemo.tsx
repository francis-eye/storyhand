import { useState, useEffect } from 'react';

const CARD_VALUES = [5, 5, 8, 5];
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
// Value-text colors on the cream card faces.
const CARD_COLORS = ['#2E7D32', '#9E9D24', '#E65100', '#558B2F'];

interface Vote {
  name: string;
  voted: boolean;
  value: number | null;
}

const INITIAL_VOTES: Vote[] = [
  { name: 'Sarah', voted: false, value: null },
  { name: 'Marcus', voted: false, value: null },
  { name: 'Priya', voted: false, value: null },
  { name: 'Jake', voted: false, value: null },
];

// Respect the user's reduced-motion preference: freeze on a static revealed frame.
const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const REVEALED_VOTES: Vote[] = INITIAL_VOTES.map((v, j) => ({ ...v, voted: true, value: CARD_VALUES[j] }));

export default function LiveSessionDemo() {
  const [phase, setPhase] = useState<'voting' | 'revealed'>(reducedMotion ? 'revealed' : 'voting');
  const [votes, setVotes] = useState<Vote[]>(reducedMotion ? REVEALED_VOTES : INITIAL_VOTES);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(2);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Simulate players voting one by one, then auto-reveal
  useEffect(() => {
    if (reducedMotion || phase !== 'voting') return;

    const delays = [800, 1800, 3000, 4200];
    const timers = delays.map((delay, i) =>
      setTimeout(() => {
        setVotes(prev =>
          prev.map((v, j) => (j === i ? { ...v, voted: true, value: CARD_VALUES[j] } : v))
        );
        if (i === delays.length - 1) {
          setTimeout(() => {
            setCountdown(3);
            setTimeout(() => setCountdown(2), 1000);
            setTimeout(() => setCountdown(1), 2000);
            setTimeout(() => {
              setCountdown(null);
              setPhase('revealed');
            }, 3000);
          }, 600);
        }
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, round]);

  // After reveal, reset for next round
  useEffect(() => {
    if (reducedMotion || phase !== 'revealed') return;
    const t = setTimeout(() => {
      setPhase('voting');
      setVotes(INITIAL_VOTES);
      setRound(r => r + 1);
      setStreak(s => s + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [phase]);

  const consensus = phase === 'revealed' && new Set(votes.map(v => v.value)).size <= 2;

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#1a1a2e',
        border: '2px solid rgba(51,255,51,0.4)',
        boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#12121f', borderBottom: '2px solid rgba(51,255,51,0.2)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-[#33ff33]">SPRINT 42</span>
          <span className="font-pixel text-[8px] px-2 py-1 bg-[#33ff33]/15 text-[#33ff33] border border-[#33ff33]/40">
            R{round}
          </span>
          {streak >= 3 && (
            <span className="font-pixel text-[8px] px-2 py-1 bg-[#ffa500]/15 text-[#ffa500] border border-[#ffa500]/40 flex items-center gap-1">
              🔥{streak}
            </span>
          )}
        </div>
        <span
          className={`font-pixel text-[8px] px-2 py-1 border ${
            phase === 'revealed'
              ? 'bg-[#33ff33]/15 text-[#33ff33] border-[#33ff33]/40'
              : 'bg-blue-500/15 text-blue-300 border-blue-500/40'
          }`}
        >
          {countdown ? `REVEAL ${countdown}` : phase === 'revealed' ? 'REVEALED' : 'VOTING'}
        </span>
      </div>

      {/* Players */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {votes.map((v, i) => (
          <div key={v.name} className="flex items-center gap-2">
            <div
              className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold border-2 border-black"
              style={{ background: PLAYER_COLORS[i] }}
            >
              {v.name[0]}
            </div>
            <span className="font-pixel-body text-base text-[#f5e6c8]/80">{v.name}</span>
            {v.voted && phase !== 'revealed' && (
              <span className="text-[#33ff33] text-xs">✓</span>
            )}
            {phase === 'revealed' && v.value !== null && (
              <span
                className="font-pixel text-[9px] px-1.5 py-0.5"
                style={{ background: '#0d0d1a', color: CARD_COLORS[i] }}
              >
                {v.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Table area — flat green felt, sharp border */}
      <div className="px-4 pb-4">
        <div
          className="p-6 flex items-center justify-center relative overflow-hidden"
          style={{
            background: '#1a3a1a',
            minHeight: '140px',
            border: '4px solid #0d2a0d',
          }}
        >
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="font-pixel text-5xl text-[#ffa500] theme-16bit-glow">
                {countdown}
              </span>
            </div>
          )}

          {!countdown && phase === 'voting' && (
            <div className="flex gap-3">
              {votes.map((v, i) =>
                v.voted ? (
                  <div
                    key={i}
                    className="w-10 h-14 flex items-center justify-center"
                    style={{
                      background: '#8b1a1a',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 rgba(0,0,0,0.4)',
                      transform: `rotate(${(i - 1.5) * 5}deg)`,
                      animation: 'dealCard 0.3s ease-out',
                    }}
                  >
                    <div className="w-6 h-10 border-2 border-[#ffa500]/30" />
                  </div>
                ) : null
              )}
            </div>
          )}

          {!countdown && phase === 'revealed' && (
            <div className="text-center">
              <div className="flex gap-3 justify-center mb-3">
                {votes.map((v, i) => (
                  <div
                    key={i}
                    className="w-10 h-14 flex items-center justify-center"
                    style={{ background: '#f5e6c8', border: '2px solid #000' }}
                  >
                    <span className="font-pixel text-xs" style={{ color: CARD_COLORS[i] }}>
                      {v.value}
                    </span>
                  </div>
                ))}
              </div>
              {consensus && (
                <div className="font-pixel text-[9px] text-[#33ff33] animate-pulse motion-reduce:animate-none">
                  ✦ NEAR CONSENSUS!
                </div>
              )}
              <div className="font-pixel-body text-lg text-[#f5e6c8]/70 mt-1">
                Avg: <span className="text-[#ffa500] font-pixel text-[10px]">5.75</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

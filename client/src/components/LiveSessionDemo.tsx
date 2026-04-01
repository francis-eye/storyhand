import { useState, useEffect } from 'react';

const CARD_VALUES = [5, 5, 8, 5];
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
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

export default function LiveSessionDemo() {
  const [phase, setPhase] = useState<'voting' | 'revealed'>('voting');
  const [votes, setVotes] = useState<Vote[]>(INITIAL_VOTES);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(2);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Simulate players voting one by one, then auto-reveal
  useEffect(() => {
    if (phase !== 'voting') return;

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
    if (phase !== 'revealed') return;
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a4a',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#12121f', borderBottom: '1px solid #2a2a4a' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm font-space-mono">Sprint 42</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
            Round {round}
          </span>
          {streak >= 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium flex items-center gap-1">
              🔥 {streak} streak
            </span>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            phase === 'revealed'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-blue-500/20 text-blue-300'
          }`}
        >
          {countdown ? `Revealing in ${countdown}...` : phase === 'revealed' ? 'Revealed' : 'Voting'}
        </span>
      </div>

      {/* Players */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {votes.map((v, i) => (
          <div key={v.name} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: PLAYER_COLORS[i] }}
            >
              {v.name[0]}
            </div>
            <span className="text-gray-400 text-xs font-medium">{v.name}</span>
            {v.voted && phase !== 'revealed' && (
              <span className="text-emerald-400 text-xs">✓</span>
            )}
            {phase === 'revealed' && v.value !== null && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#2a2a4a', color: CARD_COLORS[i] }}
              >
                {v.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Table area */}
      <div className="px-4 pb-4">
        <div
          className="rounded-xl p-6 flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'radial-gradient(circle, #1e3a1e, #152515)',
            minHeight: '140px',
            border: '3px solid #2a4a2a',
          }}
        >
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span
                className="text-6xl font-black text-amber-400 animate-pulse font-space-mono"
                style={{ textShadow: '0 0 20px rgba(251,191,36,0.4)' }}
              >
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
                    className="w-10 h-14 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #4338ca, #7c3aed)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                      transform: `rotate(${(i - 1.5) * 5}deg)`,
                      animation: 'dealCard 0.3s ease-out',
                    }}
                  />
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
                    className="w-10 h-14 rounded-lg flex items-center justify-center"
                    style={{ background: '#faf8f5', border: '2px solid #e5e2dc' }}
                  >
                    <span className="font-bold font-space-mono" style={{ color: CARD_COLORS[i] }}>
                      {v.value}
                    </span>
                  </div>
                ))}
              </div>
              {consensus && (
                <div className="text-emerald-400 text-xs font-bold animate-pulse">
                  ✦ Near Consensus!
                </div>
              )}
              <div className="text-gray-400 text-xs mt-1 font-space-mono">
                Avg: <span className="text-indigo-300 font-bold">5.75</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

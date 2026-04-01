import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveSessionDemo from '../components/LiveSessionDemo';

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const CARD_COLORS = ['#2E7D32', '#388E3C', '#558B2F', '#9E9D24', '#F57F17', '#E65100', '#D84315', '#C62828', '#AD1457', '#7B1FA2', '#4A148C'];

// Animated card that flips on hover
function MiniCard({ value, delay, color }: { value: number; delay: number; color: string }) {
  const [flipped, setFlipped] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`relative transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ perspective: '600px', transitionDelay: `${delay}ms` }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <div
        className="relative w-12 h-16 sm:w-14 sm:h-20 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #4338ca, #7c3aed)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          <div className="w-8 h-12 sm:w-10 sm:h-14 border border-white/20 rounded-md" />
        </div>
        {/* Front */}
        <div
          className="absolute inset-0 rounded-lg flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#faf8f5',
            border: '2px solid #e5e2dc',
          }}
        >
          <span className="font-bold text-lg font-space-mono" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

// Animated stat counter
function AnimatedCounter({ end, label, duration = 2000 }: { end: number; label: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          tick();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-black font-space-mono" style={{ color: '#4f46e5' }}>
        {count.toLocaleString()}+
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

// Achievement badge
function AchievementBadge({ icon, title, description, color, delay }: {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <div className="font-bold text-sm" style={{ color }}>{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
  );
}

// Feature card with scroll-triggered animation
function FeatureCard({ icon, title, description, delay }: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`p-6 rounded-2xl transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-bold text-[var(--text-primary)] mb-2">{title}</div>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</div>
    </div>
  );
}

// Landing page with hero, live demo, features, and CTA
export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ sessionsCreated: number; playersJoined: number; roundsPlayed: number } | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="font-dm-sans" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#4f46e5' }}>
            <span className="text-white text-sm font-bold">🃏</span>
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white font-space-mono">
            <span style={{ color: '#4f46e5' }}>Story</span>hand
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => navigate('/join')}
          >
            Join Game
          </button>
          <button
            className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-200"
            style={{ background: '#4f46e5' }}
            onClick={() => navigate('/create')}
          >
            Create Game
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-12 pt-16 sm:pt-24 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: '#f0edff', color: '#4f46e5' }}
            >
              <span>🎮</span> Now with 16-Bit Mode
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-gray-900 dark:text-white"
              style={{ letterSpacing: '-0.02em' }}
            >
              Sprint planning
              <br />
              that feels like
              <br />
              <span style={{ color: '#4f46e5' }}>game night.</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-lg">
              Storyhand is real-time planning poker for distributed teams.
              Create a session, share the code, and estimate stories together —
              with auto-reveal, streak tracking, and zero sign-up required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="px-8 py-3.5 text-base font-bold text-white rounded-xl transition-all hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5"
                style={{ background: '#4f46e5' }}
                onClick={() => navigate('/create')}
              >
                Deal Me In →
              </button>
              <button
                className="px-8 py-3.5 text-base font-bold rounded-xl transition-all hover:bg-gray-100"
                style={{ color: '#4f46e5', border: '2px solid #e0deff' }}
                onClick={() => navigate('/join')}
              >
                Join with Code
              </button>
            </div>
          </div>

          {/* Live demo */}
          <div className="relative">
            <div
              className="absolute -top-6 -left-6 w-24 h-24 rounded-full"
              style={{ background: 'radial-gradient(circle, #e0deff 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full"
              style={{ background: 'radial-gradient(circle, #fef3c7 0%, transparent 70%)' }}
            />
            <LiveSessionDemo />
          </div>
        </div>
      </section>

      {/* Card fan divider */}
      <section className="py-8 flex justify-center gap-2 sm:gap-3">
        {FIBONACCI.map((val, i) => (
          <MiniCard key={val} value={val} delay={i * 80} color={CARD_COLORS[i]} />
        ))}
      </section>

      {/* Stats (from /api/stats) */}
      {stats && (
        <section className="py-8">
          <div className="max-w-3xl mx-auto flex justify-center gap-12 sm:gap-16">
            <AnimatedCounter end={stats.sessionsCreated} label="games today" />
            <AnimatedCounter end={stats.playersJoined} label="players today" />
            <AnimatedCounter end={stats.roundsPlayed} label="rounds today" />
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-6 sm:px-12 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Three steps. Zero friction.
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No accounts. No downloads. No setup wizard.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Create a session', desc: 'Name it, pick your deck, and you\'re live. Takes 5 seconds.', icon: '🎯' },
              { step: '02', title: 'Share the code', desc: 'Drop the 6-character code in Slack or Zoom. Your team joins instantly.', icon: '🔗' },
              { step: '03', title: 'Estimate together', desc: 'Everyone plays a card. When the last vote lands, cards flip automatically.', icon: '🃏' },
            ].map((item) => (
              <div key={item.step} className="p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="text-xs font-bold mb-4 font-space-mono" style={{ color: '#4f46e5' }}>
                  STEP {item.step}
                </div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-bold text-[var(--text-primary)] text-lg mb-2">{item.title}</div>
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification preview */}
      <section className="px-6 sm:px-12 py-16 sm:py-24" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4"
                style={{ letterSpacing: '-0.02em' }}
              >
                Estimation,<br />but make it fun.
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                Earn achievements, track consensus streaks, and see who's the team's most accurate estimator.
                Because refinement doesn't have to feel like refinement.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <AchievementBadge icon="⚡" title="First to Vote!" color="#f59e0b" description="Played your card before everyone else" delay={0} />
              <AchievementBadge icon="🔥" title="5 Consensus Streak" color="#ef4444" description="Team agreed 5 rounds in a row" delay={150} />
              <AchievementBadge icon="🧠" title="The Oracle" color="#8b5cf6" description="Closest to the average 4 times today" delay={300} />
              <AchievementBadge icon="🤝" title="Hive Mind" color="#10b981" description="Full consensus — everyone played the same card" delay={450} />
              <AchievementBadge icon="🎯" title="The Contrarian" color="#3b82f6" description="Only person who voted differently" delay={600} />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 sm:px-12 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Everything you need. Nothing you don't.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon="⚡" title="Auto-Reveal" description="Cards flip the moment everyone has voted. No waiting for a facilitator to click a button." delay={0} />
            <FeatureCard icon="🎮" title="16-Bit Mode" description="Retro pixel art theme inspired by Balatro. CRT scanlines, pixel fonts, green felt table." delay={100} />
            <FeatureCard icon="🔒" title="Secret Voting" description="Votes are masked until reveal. No anchoring bias, no peeking, no influence." delay={200} />
            <FeatureCard icon="🔄" title="Re-Vote" description="Disagree? Hit Re-Vote to re-estimate the same ticket after discussion. New Round moves on." delay={300} />
            <FeatureCard icon="📱" title="Mobile Ready" description="Full responsive design. Estimate from your phone during standup or on the couch." delay={400} />
            <FeatureCard icon="🌙" title="Dark Mode" description="System-aware dark mode that's easy on the eyes during those late sprint sessions." delay={500} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-12 py-16 sm:py-24">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden"
          style={{ background: '#1a1a2e' }}
        >
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(79, 70, 229, 0.15), transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(124, 58, 237, 0.1), transparent 60%)' }} />
          <div className="relative z-10">
            <h2
              className="text-3xl sm:text-4xl font-black text-white mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Ready to deal?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
              Create a session in 5 seconds. Share the code. Start estimating.
              Your team will thank you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="px-8 py-3.5 text-base font-bold text-white rounded-xl transition-all hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5"
                style={{ background: '#4f46e5' }}
                onClick={() => navigate('/create')}
              >
                Create a Game →
              </button>
              <button
                className="px-8 py-3.5 text-base font-bold rounded-xl transition-all"
                style={{ color: '#a5b4fc', border: '1px solid #3730a3' }}
                onClick={() => navigate('/join')}
              >
                Join with Code
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-8" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-400 font-space-mono">
              <span style={{ color: '#4f46e5' }}>Story</span>hand
            </span>
            <span className="text-gray-300 text-xs">· Built with ☕ and story points</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              Privacy
            </button>
            <a href="https://github.com/francis-eye/storyhand" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

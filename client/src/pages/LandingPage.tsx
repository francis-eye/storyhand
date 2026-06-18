import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveSessionDemo from '../components/LiveSessionDemo';
import Logo from '../components/Logo';

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
// Value-text colors for the cream card faces (dark enough to read on #f5e6c8).
const CARD_COLORS = ['#2E7D32', '#388E3C', '#558B2F', '#9E9D24', '#F57F17', '#E65100', '#D84315', '#C62828', '#AD1457', '#7B1FA2', '#4A148C'];

// Animated pixel card that flips on hover (card-fan divider).
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
        {/* Back — crimson poker card back, sharp corners, orange inner accent */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            background: '#8b1a1a',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-8 h-12 sm:w-10 sm:h-14 border-2 border-[#ffa500]/30" />
        </div>
        {/* Front — cream face, sharp corners, pixel value */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#f5e6c8',
            border: '2px solid #000',
          }}
        >
          <span className="font-pixel text-[10px] sm:text-xs" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

// Animated stat counter — pixel number + label (lives on a dark scoreboard panel).
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
      {/* Orange neon number — AA-safe because it sits on the dark .pixel-panel scoreboard */}
      <div className="font-pixel text-xl sm:text-3xl text-[#ffa500] theme-16bit-glow">
        {count.toLocaleString()}+
      </div>
      <div className="font-pixel text-[9px] uppercase tracking-wider text-[#33ff33]/80 mt-3">{label}</div>
    </div>
  );
}

// Achievement "unlock" tile.
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
      className={`pixel-panel flex items-center gap-3 p-3 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
    >
      <div
        className="w-10 h-10 flex items-center justify-center text-lg flex-shrink-0 border-2 border-black"
        style={{ background: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <div className="font-pixel text-[10px] uppercase" style={{ color }}>{title}</div>
        <div className="font-pixel-body text-base text-[#f5e6c8]/80 leading-tight mt-1">{description}</div>
      </div>
    </div>
  );
}

// Feature card with scroll-triggered animation.
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
      className={`pixel-panel p-6 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-pixel text-xs uppercase text-[#33ff33] mb-3 leading-relaxed">{title}</div>
      <div className="font-pixel-body text-lg text-[#f5e6c8]/85 leading-snug">{description}</div>
    </div>
  );
}

// Compact pixel nav button styles (sharp corners by default).
const NAV_PRIMARY = 'font-pixel text-[10px] uppercase tracking-wider text-white bg-[#991b1b] border-2 border-[#dc2626] px-4 py-2.5 hover:bg-[#b91c1c] transition-colors';
const NAV_SECONDARY = 'font-pixel text-[10px] uppercase tracking-wider text-[#ffa500]/80 border-2 border-[#ffa500]/50 px-4 py-2.5 hover:text-[#ffa500] hover:border-[#ffa500] transition-colors';

// Landing page — full-arcade 16-bit front door.
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
    <div className="felt-page felt-vignette font-pixel-body">
      {/* Page-level scanline overlay — sits under content (z-10), never traps clicks */}
      <div className="scanlines-overlay" aria-hidden="true" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-12 py-3 bg-[#1a1a2e] border-b-2 border-[#33ff33]/30">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo variant="horizontal" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className={NAV_SECONDARY} onClick={() => navigate('/join')}>Join</button>
            <button className={NAV_PRIMARY} onClick={() => navigate('/create')}>Create</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-4 sm:px-12 pt-12 sm:pt-20 pb-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Badge chip on a dark panel so neon reads cleanly */}
              <div className="inline-flex items-center gap-2 px-3 py-2 mb-6 bg-[#0d0d1a] border-2 border-[#33ff33]/40">
                <span>🎮</span>
                <span className="font-pixel text-[9px] uppercase tracking-wider text-[#33ff33]">16-Bit Mode</span>
              </div>

              {/* Headline — Press Start 2P, pre-broken so every line fits at 320px */}
              <h1 className="font-pixel text-sm sm:text-2xl lg:text-4xl leading-[1.6] text-[#f5e6c8] mb-6">
                SPRINT PLANNING<br />
                THAT FEELS LIKE<br />
                <span className="text-[#33ff33] theme-16bit-glow-green">GAME NIGHT.</span>
              </h1>

              {/* Lede — VT323 body tier, cream (legible on felt) */}
              <p className="font-pixel-body text-xl text-[#f5e6c8] mb-4 leading-snug max-w-lg">
                Real-time planning poker for distributed teams. Create a session, share the code,
                and estimate stories together — auto-reveal, streak tracking, zero sign-up.
              </p>

              {/* Trust beat — keeps the skeptical buyer reassured */}
              <p className="font-pixel-body text-lg text-[#33ff33]/90 mb-8">
                No account · No credit card · Free &amp; open-source
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="btn-pixel-primary" onClick={() => navigate('/create')}>
                  Deal Me In →
                </button>
                <button className="btn-pixel-secondary" onClick={() => navigate('/join')}>
                  Join With Code
                </button>
              </div>
            </div>

            {/* Live demo (always-dark arcade cabinet) */}
            <div className="relative">
              <LiveSessionDemo />
            </div>
          </div>
        </section>

        {/* Card fan divider — wraps on narrow screens so it never overflows the viewport */}
        <section className="py-8 px-4 flex flex-wrap justify-center gap-2 sm:gap-3">
          {FIBONACCI.map((val, i) => (
            <MiniCard key={val} value={val} delay={i * 80} color={CARD_COLORS[i]} />
          ))}
        </section>

        {/* Stats (from /api/stats) — pixel "high score" scoreboard on a dark panel */}
        {stats && (
          <section className="px-4 sm:px-12 py-8">
            <div className="pixel-panel max-w-3xl mx-auto flex justify-center gap-10 sm:gap-16 py-6">
              <AnimatedCounter end={stats.sessionsCreated} label="games today" />
              <AnimatedCounter end={stats.playersJoined} label="players today" />
              <AnimatedCounter end={stats.roundsPlayed} label="rounds today" />
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="px-4 sm:px-12 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-pixel text-lg sm:text-2xl text-[#33ff33] theme-16bit-glow-green mb-4 leading-relaxed">
                THREE STEPS.<br className="sm:hidden" /> ZERO FRICTION.
              </h2>
              <p className="font-pixel-body text-xl text-[#f5e6c8]/85">No accounts. No downloads. No setup wizard.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Create a session', desc: "Name it, pick your deck, and you're live. Takes 5 seconds.", icon: '🎯' },
                { step: '02', title: 'Share the code', desc: 'Drop the 6-character code in Slack or Zoom. Your team joins instantly.', icon: '🔗' },
                { step: '03', title: 'Estimate together', desc: 'Everyone plays a card. When the last vote lands, cards flip automatically.', icon: '🃏' },
              ].map((item) => (
                <div key={item.step} className="pixel-panel p-6">
                  <div className="font-pixel text-[10px] text-[#ffa500] mb-4">STEP {item.step}</div>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-pixel text-xs uppercase text-[#33ff33] mb-3 leading-relaxed">{item.title}</div>
                  <div className="font-pixel-body text-lg text-[#f5e6c8]/85 leading-snug">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gamification preview (on the lighter felt floor) */}
        <section className="felt-floor px-4 sm:px-12 py-16 sm:py-24 border-y-2 border-[#0d2a0d]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-pixel text-lg sm:text-2xl text-[#33ff33] theme-16bit-glow-green mb-4 leading-relaxed">
                  ESTIMATION,<br />BUT MAKE IT FUN.
                </h2>
                <p className="font-pixel-body text-xl text-[#f5e6c8] leading-snug">
                  Earn achievements, track consensus streaks, and see who's the team's most accurate estimator.
                  Because refinement doesn't have to feel like refinement.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <AchievementBadge icon="⚡" title="First to Vote!" color="#f59e0b" description="Played your card before everyone else" delay={0} />
                <AchievementBadge icon="🔥" title="5 Consensus Streak" color="#ef4444" description="Team agreed 5 rounds in a row" delay={150} />
                <AchievementBadge icon="🧠" title="The Oracle" color="#a78bfa" description="Closest to the average 4 times today" delay={300} />
                <AchievementBadge icon="🤝" title="Hive Mind" color="#34d399" description="Full consensus — everyone played the same card" delay={450} />
                <AchievementBadge icon="🎯" title="The Contrarian" color="#60a5fa" description="Only person who voted differently" delay={600} />
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="px-4 sm:px-12 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-pixel text-base sm:text-2xl text-[#33ff33] theme-16bit-glow-green leading-relaxed">
                EVERYTHING YOU NEED.<br className="sm:hidden" /> NOTHING YOU DON'T.
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
        <section className="px-4 sm:px-12 py-16 sm:py-24">
          <div className="pixel-panel max-w-4xl mx-auto p-10 sm:p-16 text-center">
            <h2 className="font-pixel text-xl sm:text-3xl text-[#33ff33] theme-16bit-glow-green mb-6">
              READY TO DEAL?
            </h2>
            <p className="font-pixel-body text-xl text-[#f5e6c8]/90 mb-8 max-w-lg mx-auto leading-snug">
              Create a session in 5 seconds. Share the code. Start estimating. Your team will thank you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-pixel-primary" onClick={() => navigate('/create')}>
                Create A Game →
              </button>
              <button className="btn-pixel-secondary" onClick={() => navigate('/join')}>
                Join With Code
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-12 py-10 border-t-2 border-[#0d2a0d]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo variant="horizontal" markSize={24} />
              <span className="font-pixel-body text-base text-[#f5e6c8]/60">· Built with ☕ and story points</span>
            </div>
            <div className="flex gap-6 font-pixel-body text-lg text-[#f5e6c8]/80">
              <button onClick={() => navigate('/privacy')} className="hover:text-[#33ff33] transition-colors">
                Privacy
              </button>
              <a
                href="https://github.com/sponsors/francis-eye"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#ffa500] transition-colors"
              >
                ♥ Sponsor
              </a>
              <a href="https://github.com/francis-eye/storyhand" target="_blank" rel="noopener noreferrer" className="hover:text-[#33ff33] transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Storyhand brand lockup: a pixel playing-card "S" mark + Press Start 2P wordmark.
// "Storyhand" is a pun — a HAND of cards + user STORIES. The mark is a cream card
// (front) with a crimson card peeking behind it (the "hand"), bearing a neon-green
// pixel "S". It evolves the favicon's green-S-on-dark-felt DNA.
//
// Two layouts:
//   variant="horizontal" — mark beside wordmark (Header, landing nav, footer)
//   variant="stacked"    — mark above wordmark (landing hero)
//
// Pure presentational. Knows nothing about the session theme registry.

type LogoProps = {
  variant?: 'horizontal' | 'stacked';
  /** Pixel size of the square card mark. Defaults: 32 (horizontal), 112 (stacked). */
  markSize?: number;
  className?: string;
};

// The pixel card "S" mark (dark-felt variant — reads on any background).
// Integer coords on a 4px grid + crispEdges so pixels stay sharp at every size.
function CardMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Storyhand"
      className="shrink-0"
    >
      {/* dark felt tile + pixel border frame (echoes favicon #1a3a1a / #0d2a0d) */}
      <rect width="64" height="64" fill="#1a3a1a" />
      <rect x="4" y="4" width="56" height="56" fill="none" stroke="#0d2a0d" strokeWidth="4" />
      {/* back card sliver — the "hand" */}
      <rect x="14" y="12" width="8" height="42" fill="#8b1a1a" />
      <rect x="14" y="12" width="8" height="42" fill="none" stroke="#000" strokeWidth="2" />
      {/* front cream card */}
      <rect x="22" y="10" width="28" height="44" fill="#f5e6c8" />
      <rect x="22" y="10" width="28" height="44" fill="none" stroke="#000" strokeWidth="3" />
      {/* orange inner accent border (echoes card faceDownInner #ffa500/30) */}
      <rect x="26" y="14" width="20" height="36" fill="none" stroke="#ffa500" strokeWidth="2" />
      {/* neon-green pixel "S" */}
      <g fill="#33ff33">
        <rect x="29" y="18" width="15" height="3" />
        <rect x="29" y="21" width="3" height="6" />
        <rect x="29" y="27" width="15" height="3" />
        <rect x="41" y="30" width="3" height="6" />
        <rect x="29" y="36" width="15" height="3" />
      </g>
    </svg>
  );
}

export default function Logo({ variant = 'horizontal', markSize, className = '' }: LogoProps) {
  const isStacked = variant === 'stacked';
  const size = markSize ?? (isStacked ? 112 : 32);

  return (
    <span
      className={[
        'inline-flex items-center',
        isStacked ? 'flex-col gap-4' : 'gap-2.5',
        className,
      ].join(' ')}
    >
      <CardMark size={size} />
      {/* Wordmark: STORY (neon green) + HAND (gold) — the pun, in the session palette. */}
      <span
        className={[
          'font-pixel leading-none select-none',
          isStacked
            ? 'text-2xl sm:text-4xl tracking-[0.04em]'
            // Horizontal lockup collapses to mark-only on small phones so navs fit at 320px.
            : 'text-[13px] sm:text-base tracking-[0.05em] max-[460px]:hidden',
        ].join(' ')}
      >
        <span className="text-[#33ff33] theme-16bit-glow-green">STORY</span>
        <span className="text-[#ffa500] theme-16bit-glow-gold">HAND</span>
      </span>
    </span>
  );
}

import type { ReactNode } from 'react';

// Wraps a marketing/funnel page in the full-arcade 16-bit felt + scanline shell.
// Pure presentational — knows nothing about the session theme registry.
// The felt + vignette carry their own light/dark variants; the scanline overlay
// is a single fixed, click-through layer that sits UNDER content (which is z-10).
export default function ArcadeShell({ children }: { children: ReactNode }) {
  return (
    <div className="felt-page felt-vignette font-pixel-body">
      <div className="scanlines-overlay" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

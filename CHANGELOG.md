# Changelog

All notable changes to Storyhand are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Dates are `YYYY-MM-DD`.

## [Unreleased]

### Added — Full-arcade 16-bit front door (2026-06-18)
- The entire pre-game funnel (landing page, logo, Create Game, Join Session) is
  now a full-arcade 16-Bit Balatro experience that matches the default in-session
  theme: green felt, CRT scanlines, neon green/gold, pixel panels, and sharp corners.
- **New pixel logo** — a "Card S" mark (cream card + crimson "hand" card + neon-green
  "S") with a `STORY`/`HAND` Press Start 2P wordmark. Replaces the indigo text logo
  in the header and landing nav. Favicon updated to a font-independent pixel "S".
- **Two-tier retro type system** — Press Start 2P for headlines/labels, VT323 for
  body copy so paragraphs and form inputs stay readable.
- **Light and dark felt variants** that follow the existing color-mode toggle.
- Restyled `LiveSessionDemo` hero (crimson card backs, flat felt, neon labels) and a
  pixel "scoreboard" treatment for the daily activity stats.
- Accessibility: `prefers-reduced-motion` guard freezes the demo loop and decorative
  motion; contrast tuned for the light-felt variant; verified no horizontal overflow
  at 320px.

### Notes
- Implemented as a decoupled global CSS layer in `client/src/index.css` plus
  `ArcadeShell` and `Logo` components. The in-session theme registry
  (`themeRegistry.ts`) and all session/socket code are untouched.

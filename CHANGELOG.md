# Changelog

All notable changes to Storyhand are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Dates are `YYYY-MM-DD`.

## [Unreleased]

### Security & Fixed — Vote integrity + dependency patch (2026-07-06)
- **Votes are now tied to the sender's own identity.** Previously a participant could
  cast or change a vote under another player's name by supplying that player's ID. The
  server now ignores any client-supplied player ID on `play-card` and attributes the
  vote to the socket that sent it, so no one can vote on someone else's behalf (which
  also keeps the average, consensus, and MVP stats honest).
- **Patched a high-severity WebSocket dependency** (`ws` 8.18.3 → 8.21.0) via
  `npm audit fix` — clears all production `npm audit` advisories. No app dependencies
  changed, lockfile only.
- **Hardened `.gitignore`** to ignore `.env` files (bare `.env` was not previously
  ignored — only `*.local` was), preventing accidental commit of webhook/secret env vars.
- **Docs:** corrected CLAUDE.md to reflect that Reveal / New Round / Re-Vote are
  intentional shared controls (any participant), not host-only.

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

### Changed — Session-complete modal redesign (2026-06-18)
- The end-of-session summary now **matches the session's theme**: full-arcade 16-bit
  (pixel panel, neon, red poker button) for 16-Bit sessions, clean card for Classic.
- **No more dead-end** — "Done → home" is replaced with **Play Again** and **Home**.
  Play Again opens the Create form **pre-filled with the ended session's settings**
  (game name, theme, average/countdown/timeout).
- **Safer exit** — the facilitator's Exit now shows a themed "End session for
  everyone?" confirmation instead of instantly ending the room for all participants.
- **Inactivity timeouts now show the same recap card** (the server computes and sends
  the summary on timeout) instead of a bare "Session has ended." error.

### Notes
- Implemented as a decoupled global CSS layer in `client/src/index.css` plus
  `ArcadeShell` and `Logo` components. The in-session theme registry
  (`themeRegistry.ts`) and all session/socket code are untouched.

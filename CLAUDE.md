# Storyhand

Real-time story point estimation for distributed agile teams. Think planning poker, but lightweight — no accounts, no setup, no downloads.

## What We're Building

A multiplayer web app where a Host creates an estimation session, shares a Session ID, and team members join to vote on story points using a Fibonacci card deck. Votes are masked until the Host reveals them simultaneously.

## Tech Stack

- **Frontend:** React, TypeScript, Material UI, Tailwind CSS
- **Routing:** React Router
- **Backend:** Node.js + Express *(not yet built)*
- **Real-time:** Socket.IO *(not yet built)*
- **Database:** None — all session data lives in memory and is purged on expiration
- **Deployment:** TBD (Railway or Render are good options)

## Current State (as of March 2026)

### What's Built (UI Prototype — Fully Functional Locally)

The complete frontend prototype is built with React + TypeScript + Material UI + Tailwind CSS. All screens and components are working with local state management. Bot players simulate multiplayer behavior for demo purposes.

**Pages (4/4 complete):**
- `LandingPage.tsx` — Hero with "Create Game" and "Join Game" CTAs
- `CreateGamePage.tsx` — Game name, host name, voting system, collapsible advanced settings (average, countdown, timeout slider)
- `JoinSessionPage.tsx` — Session ID input (6-char, uppercase), role selector cards (Player/Observer), conditional name field
- `SessionPage.tsx` — Full session layout with sidebar roster, game table, card deck (Players), host controls (Host)

**Components (10/10 complete):**
- `Header.tsx` — Custom Storyhand SVG logo, nav, Exit button on non-landing pages
- `SessionHeader.tsx` — Game name, round counter, phase chip (color-coded), Session ID with copy-to-clipboard
- `PlayerRoster.tsx` — Grouped by role (Host → Players → Observers), with dividers and counts
- `PlayerAvatar.tsx` — Colored initial avatar, role badges (crown/eye/checkmark), mini card vote status, disconnected visual treatment (greyed out)
- `GameTable.tsx` — Poker table with voted cards (pseudo-random rotation), vote counter, countdown animation, results overlay
- `CardDeck.tsx` — 13 Fibonacci cards, horizontally scrollable on mobile, centered on desktop, disabled when not voting phase
- `PlayingCard.tsx` — 3D CSS flip animation, three sizes (small/medium/large), face-down gradient design, face-up with corner values
- `HostControls.tsx` — Floating dark pill with context-aware buttons: "Reveal Cards" (voting), "Re-Vote" + "New Round" (revealed), with tooltips
- `ResultsPanel.tsx` — Average, vote count, consensus banner, high-variance warning, vote distribution bar chart

**State Management:**
- `useGameState.tsx` — React Context provider with all core actions: createGame, joinGame, playCard, revealCards, startNewRound, reVote, removePlayer, leaveGame
- Currently uses local state only (no server). Bot players auto-vote with random delays for demo purposes.
- `resetVotes()` helper shared between New Round (increments round counter) and Re-Vote (keeps same round)
- Countdown timer: 3-second delay before reveal when enabled

**Types (`game.ts`):**
- `Role`: 'host' | 'player' | 'observer'
- `GamePhase`: 'waiting' | 'voting' | 'countdown' | 'revealed'
- `CardValue`: number | '?' | '☕'
- `Player`: id, name, role, vote, hasVoted, isConnected, disconnectedAt
- `GameSettings`: gameName, votingSystem, showAverage, showCountdown, inactivityTimeout
- `GameState`: sessionId, settings, phase, players, currentRound, hostId
- `FIBONACCI_DECK`: readonly array of all 13 card values

**Utilities (`session.ts`):**
- `generateSessionId()` — 6-char alphanumeric (uses Math.random, needs crypto.randomBytes on server)
- `generatePlayerId()` — random string ID
- `calculateAverage()` — filters out non-numeric votes (? and ☕), returns rounded mean
- `checkConsensus()` — true if all numeric votes are identical
- `stringToColor()` — deterministic color from player name for avatar backgrounds

### What's NOT Built Yet

1. **Socket.IO backend** — The entire real-time server. Currently all state is local (single browser). This is the biggest remaining piece.
2. **Disconnection handling** — `Player.disconnectedAt` field exists in the type, `PlayerAvatar` has visual treatment for disconnected state (greyed out + red label), but no timer logic to auto-remove after 2 minutes.
3. **Inactivity timeout** — Setting is captured in `GameSettings` and configurable via the slider in Advanced Settings, but nothing watches the clock or expires sessions.
4. **Re-Vote UX indicator** — Re-Vote action works (resets cards without incrementing round), but the PRD says the UX should make it visually clear the team is re-voting the same item (e.g., "Re-voting..." label). Currently looks identical to a fresh voting phase.
5. **Cryptographic Session IDs** — Frontend uses `Math.random()`. Server should use `crypto.randomBytes()` for non-guessable IDs.
6. **Legacy React render** — `index.tsx` uses deprecated `ReactDOM.render()`. Should migrate to `createRoot` (React 18+).
7. **Tailwind config** — `tailwind.config.js` exports empty object `{}`. Needs proper content paths when scaffolding the real project.

## Core Concepts

### User Roles
- **Host** — Non-voting facilitator. Creates the session, reveals cards, starts new rounds, triggers re-votes. Cannot play cards.
- **Player** — Named participant who selects cards to estimate effort. Auto-removed after 2 minutes of disconnection.
- **Observer** — Anonymous (unnamed) participant who watches the session but cannot vote.

### Session Flow
1. Host creates a game (name + Fibonacci voting system + optional advanced settings)
2. System generates a unique alphanumeric Session ID
3. Host shares Session ID with the team (via Slack, Zoom, etc.)
4. Players/Observers join by entering the Session ID and choosing their role
5. Players select a card from the deck — votes are masked (face-down) until reveal
6. Host clicks "Reveal Cards" — all votes shown simultaneously with average score
7. Host can "Re-Vote" (same item) or "Start New Round" (next item)

### Card Deck (Fibonacci)
```
0 | 1 | 2 | 3 | 5 | 8 | 13 | 21 | 34 | 55 | 89 | ? | ☕
```
- `?` = unsure / needs more info (excluded from average)
- `☕` = AFK (excluded from average)

## Key Decisions

| Decision | Resolution |
|----------|-----------|
| Host voting | Non-voting facilitator only |
| Player disconnect | Auto-removed after 2-min grace period; reconnect within window restores state |
| Re-Vote vs New Round | Both supported — Re-Vote re-estimates same item, New Round moves to next |
| Session timeout | Default 30 minutes of inactivity, configurable in Advanced Settings |
| Max concurrent players | 50 per session |

## Next Steps (Priority Order)

### Phase 1: Scaffold the Real Project
- Initialize proper project with `package.json`, build tooling (Vite recommended)
- Organize files into `src/components/`, `src/pages/`, `src/hooks/`, `src/types/`, `src/utils/`
- Migrate from `ReactDOM.render()` to `createRoot`
- Set up proper Tailwind config with content paths
- Verify the prototype runs locally with `npm run dev`

### Phase 2: Build the Socket.IO Backend
- Create `server/` directory with Express + Socket.IO
- Implement `SessionManager` — in-memory store for all active sessions
- Server-side session ID generation with `crypto.randomBytes()`
- Socket events: `create-session`, `join-session`, `play-card`, `reveal-cards`, `new-round`, `re-vote`, `disconnect`
- Move all game state logic from `useGameState.tsx` to the server
- Replace `GameProvider` local state with Socket.IO event listeners
- Remove bot simulation code

### Phase 3: Implement Missing Features
- Disconnection handling: server-side 2-minute grace period timer, auto-remove, state preservation on reconnect
- Inactivity timeout: server-side timer per session (configurable, default 30 min), auto-expire and purge
- Re-Vote UX: add visual indicator ("Re-voting..." label or retained ticket context) when re-vote is triggered vs new round
- Session validation: reject joins for non-existent or expired sessions

### Phase 4: Deploy
- Choose host (Railway, Render, or similar)
- Configure environment variables
- Set up production build pipeline
- Test with real distributed users

## File Structure (Current — Flat)

```
storyhand/
├── App.tsx
├── index.tsx
├── index.css
├── tailwind.config.js
├── game.ts                 # TypeScript types
├── session.ts              # Utility functions
├── useGameState.tsx        # State management (React Context)
├── LandingPage.tsx
├── CreateGamePage.tsx
├── JoinSessionPage.tsx
├── SessionPage.tsx
├── Header.tsx
├── SessionHeader.tsx
├── CardDeck.tsx
├── PlayingCard.tsx
├── GameTable.tsx
├── PlayerRoster.tsx
├── PlayerAvatar.tsx
├── HostControls.tsx
└── ResultsPanel.tsx
```

## File Structure (Target)

```
storyhand/
├── CLAUDE.md
├── README.md
├── client/
│   ├── src/
│   │   ├── components/     # Header, SessionHeader, CardDeck, PlayingCard, GameTable,
│   │   │                   # PlayerRoster, PlayerAvatar, HostControls, ResultsPanel
│   │   ├── pages/          # LandingPage, CreateGamePage, JoinSessionPage, SessionPage
│   │   ├── hooks/          # useGameState (refactored for Socket.IO)
│   │   ├── types/          # game.ts
│   │   ├── utils/          # session.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── package.json
├── server/
│   ├── index.js            # Express + Socket.IO server
│   ├── sessionManager.js   # In-memory session state
│   └── package.json
└── docs/
    └── Storyhand_PRD_v1.1.docx
```

## Import Paths to Update During Reorganization

The current prototype uses relative imports that assume a flat structure. When reorganizing into the target structure, update these import paths across all files:

- `../types/game` → types are in `src/types/game.ts`
- `../hooks/useGameState` → hook is in `src/hooks/useGameState.tsx`
- `../utils/session` → utils are in `src/utils/session.ts`
- `../components/*` → components are in `src/components/`
- `../pages/*` → pages are in `src/pages/`

## Socket.IO Event Reference (For Backend Implementation)

When building the server, these are the events to implement:

**Client → Server:**
- `create-session` { settings: GameSettings, hostName: string } → returns sessionId
- `join-session` { sessionId: string, role: Role, name?: string } → returns GameState
- `play-card` { sessionId: string, playerId: string, value: CardValue }
- `reveal-cards` { sessionId: string } (host only)
- `new-round` { sessionId: string } (host only)
- `re-vote` { sessionId: string } (host only)
- `leave-session` { sessionId: string, playerId: string }

**Server → Client (broadcast to session):**
- `player-joined` { player: Player }
- `player-left` { playerId: string }
- `card-played` { playerId: string, hasVoted: true } (no value — votes are secret)
- `cards-revealed` { players: Player[] } (with vote values)
- `round-reset` { currentRound: number, isReVote: boolean }
- `player-disconnected` { playerId: string }
- `player-reconnected` { playerId: string }
- `session-expired` {}

## Development Notes

- This is a learning project — Francis is picking up React and Node.js through building this
- Explain concepts clearly when introducing new patterns
- Keep code well-commented
- Prefer simple, readable implementations over clever abstractions
- The PRD (Storyhand_PRD_v1.1.docx) in /docs has the full spec with acceptance criteria
- The UI prototype was built using Magic Patterns and is the source of truth for visual design
- Material UI + Tailwind are both used (MUI for complex components like Accordion/Slider, Tailwind for layout and utility styling)

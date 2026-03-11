# Storyhand

Real-time story point estimation for distributed agile teams. Think planning poker, but lightweight — no accounts, no setup, no downloads.

## What We're Building

A multiplayer web app where a Host creates an estimation session, shares a Session ID, and team members join to vote on story points using a Fibonacci card deck. Votes are masked until the Host reveals them simultaneously.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Material UI, Vite
- **Routing:** React Router v7
- **Backend:** Node.js + Express
- **Real-time:** Socket.IO
- **Database:** None — all session data lives in memory and is purged on expiration
- **Deployment:** Railway (auto-deploys from GitHub)

## Current State (as of March 2026)

### What's Built — Everything is functional and deployed

**Phases 1–4 are complete.** The app is fully playable with real-time multiplayer, deployed on Railway, and ready for team use.

**Pages (5 pages):**
- `LandingPage.tsx` — Hero with "Create Game" and "Join Game" CTAs, daily activity stats, footer with author credit and privacy policy link
- `CreateGamePage.tsx` — Game name, host name, voting system, collapsible advanced settings (average, countdown, timeout slider)
- `JoinSessionPage.tsx` — Session ID input (6-char, uppercase), role selector cards (Player/Observer), conditional name field, error display for invalid sessions
- `SessionPage.tsx` — Full session layout with sidebar roster, game table, card deck (Players), host controls (Host)
- `PrivacyPage.tsx` — Privacy policy covering data collection, storage, and sharing practices

**Components (9 components):**
- `Header.tsx` — Storyhand text logo, Exit button on non-landing pages
- `SessionHeader.tsx` — Game name, round counter, phase chip (color-coded), re-voting indicator, Session ID with copy-to-clipboard
- `PlayerRoster.tsx` — Grouped by role (Host → Players → Observers), with dividers and counts, vote status indicators
- `PlayerAvatar.tsx` — Colored initial avatar, role badges (crown/eye), vote status, disconnected visual treatment (greyed out + red label)
- `GameTable.tsx` — Poker table with voted cards (pseudo-random rotation), vote counter, 3-2-1 countdown animation, results overlay
- `CardDeck.tsx` — 13 Fibonacci cards, horizontally scrollable on mobile, centered on desktop, disabled when not voting phase
- `PlayingCard.tsx` — 3D CSS flip animation, three sizes (small/medium/large), face-down gradient design, face-up with corner values
- `HostControls.tsx` — Floating dark pill with context-aware buttons: "Reveal Cards" (voting), "Re-Vote" + "New Round" (revealed), countdown display
- `ResultsPanel.tsx` — Average, vote count, consensus banner, high-variance warning, vote distribution bar chart

**State Management (`useGameState.tsx`):**
- React Context provider wrapping the app
- Socket.IO client — all actions emit events to the server, listeners update state from broadcasts
- Countdown timer runs client-side (3→2→1 before reveal when enabled)
- Actions: createGame (async), joinGame (async), playCard, revealCards, startNewRound, reVote, removePlayer, leaveGame
- Error state for failed joins (invalid session ID)

**Server (`server/`):**
- `index.js` — Express + Socket.IO server, serves built client in production, API endpoints (/health, /api/stats)
- `sessionManager.js` — In-memory session store with:
  - Cryptographic ID generation (`crypto.randomBytes` for sessions, `crypto.randomUUID` for players)
  - Vote sanitization (hides vote values until reveal phase)
  - 2-minute disconnect grace period with auto-removal
  - Configurable inactivity timeout with periodic checking (every 30s)
  - Re-vote tracking (`isReVoting` flag)
  - Daily activity stats (sessions created, players joined, rounds played)
  - Broadcast callback for server-initiated events (auto-removal, session expiry)

**Types (`game.ts`):**
- `Role`: 'host' | 'player' | 'observer'
- `GamePhase`: 'waiting' | 'voting' | 'countdown' | 'revealed'
- `CardValue`: number | '?' | '☕'
- `Player`: id, name, role, vote, hasVoted, isConnected, disconnectedAt
- `GameSettings`: gameName, votingSystem, showAverage, showCountdown, inactivityTimeout
- `GameState`: sessionId, settings, phase, players, currentRound, hostId, isReVoting, countdownValue
- `FIBONACCI_DECK`: readonly array of all 13 card values

**Utilities (`session.ts`):**
- `generateSessionId()` — client-side fallback (server uses crypto)
- `generatePlayerId()` — client-side fallback (server uses crypto.randomUUID)
- `calculateAverage()` — filters out non-numeric votes (? and ☕), returns rounded mean
- `checkConsensus()` — true if all numeric votes are identical
- `stringToColor()` — deterministic color from player name for avatar backgrounds

### What Could Be Built Next

- **Custom card decks** — T-shirt sizes, powers of 2, etc.
- **Session history & export** — save results for retrospectives
- **Jira integration** — pull stories directly into rounds
- **Reconnection on page refresh** — `reconnect-session` event exists on server but client doesn't persist session/player IDs across refreshes yet
- **Re-Vote UX enhancement** — the "Re-voting..." chip exists but could retain ticket context

## Core Concepts

### User Roles
- **Host** — Voting facilitator. Creates the session, plays cards, reveals cards, starts new rounds, triggers re-votes. Can transfer host role to any player.
- **Player** — Named participant who selects cards to estimate effort. Auto-removed after 2 minutes of disconnection.
- **Observer** — Anonymous (unnamed) participant who watches the session but cannot vote.

### Session Flow
1. Host creates a game (name + Fibonacci voting system + optional advanced settings)
2. System generates a unique alphanumeric Session ID (cryptographic, server-side)
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
| Host voting | Host can vote on cards while retaining all host controls (Reveal, Re-Vote, New Round) |
| Player disconnect | Auto-removed after 2-min grace period; reconnect within window restores state |
| Re-Vote vs New Round | Both supported — Re-Vote re-estimates same item, New Round moves to next |
| Session timeout | Default 30 minutes of inactivity, configurable in Advanced Settings |
| Max concurrent players | 50 per session |
| Countdown | Client-side 3→2→1 animation; server sets phase to 'revealed' immediately |
| Host transfer | Host can promote any connected player to host; old host becomes a player |
| Vote secrecy | Server never broadcasts vote values until host reveals; only `hasVoted: true` is sent |

## File Structure

```
storyhand/
├── CLAUDE.md
├── README.md
├── package.json              # Root scripts: install:all, build, start
├── client/
│   ├── src/
│   │   ├── components/       # Header, SessionHeader, CardDeck, PlayingCard, GameTable,
│   │   │                     # PlayerRoster, PlayerAvatar, HostControls, ResultsPanel
│   │   ├── pages/            # LandingPage, CreateGamePage, JoinSessionPage, SessionPage, PrivacyPage
│   │   ├── hooks/            # useGameState (Socket.IO client + React Context)
│   │   ├── types/            # game.ts
│   │   ├── utils/            # session.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts        # Tailwind plugin + dev proxy for /socket.io and /api
│   └── package.json
├── server/
│   ├── index.js              # Express + Socket.IO server + static file serving
│   ├── sessionManager.js     # In-memory session state + disconnect timers + stats
│   └── package.json
└── docs/
```

## Socket.IO Event Reference

**Client → Server:**
- `create-session` { settings: GameSettings, hostName: string } → callback with { sessionId, hostId, gameState }
- `join-session` { sessionId: string, role: Role, name?: string } → callback with { playerId, gameState } or error
- `reconnect-session` { sessionId: string, playerId: string } → callback with { gameState } or error
- `play-card` { sessionId: string, playerId: string, value: CardValue }
- `reveal-cards` { sessionId: string } (host only)
- `new-round` { sessionId: string } (host only)
- `re-vote` { sessionId: string } (host only)
- `transfer-host` { sessionId: string, newHostId: string } (host only)
- `leave-session` { sessionId: string, playerId: string }

**Server → Client (broadcast to session):**
- `player-joined` { player: Player }
- `player-left` { playerId: string }
- `card-played` { playerId: string, hasVoted: true } (no value — votes are secret)
- `cards-revealed` { players: Player[] } (with vote values)
- `round-reset` { currentRound: number, isReVote: boolean }
- `phase-changed` { phase: GamePhase }
- `player-disconnected` { playerId: string }
- `player-reconnected` { playerId: string }
- `host-transferred` { oldHostId: string, newHostId: string }
- `session-expired` {}

## API Endpoints

- `GET /health` — Server health check with active session count
- `GET /api/stats` — Daily activity metrics (sessionsCreated, playersJoined, roundsPlayed, activeSessions)

## Development

### Running Locally
```bash
# Terminal 1: Server
cd server && npm install && npm run dev

# Terminal 2: Client
cd client && npm install && npm run dev
```

### Production Build
```bash
cd client && npm run build
cd server && NODE_ENV=production node index.js
```

### Deployment (Railway)
- **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
- **Start Command:** `cd server && NODE_ENV=production node index.js`
- Auto-deploys from `main` branch on GitHub

## QA Process

Every change must be tested locally before committing. Ship zero bugs.

### Before Every Commit
1. **Type-check:** `cd client && npx tsc -b` — must pass with no errors
2. **Start server:** `cd server && node index.js` (port 3001)
3. **Run integration tests:** Use `socket.io-client` (devDep in `server/`) to simulate multiplayer flows
4. **Verify:** All Socket.IO events fire correctly, state transitions work, edge cases handled
5. **Stop server** after tests pass

### Test Pattern
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001', { transports: ['websocket'] });
// Create session, join players, simulate actions, assert events received
```

### What to Test
- Happy path for the feature being changed
- Disconnect/reconnect flows if touching session or player state
- Host transfer if touching role logic
- Edge cases: no players to promote, expired sessions, race conditions

### When in Doubt
- Ask Francis before proceeding — never assume
- Use planning mode for non-trivial changes
- Resolve all ambiguity before writing code

## Development Notes

- This is a learning project — Francis is picking up React and Node.js through building this
- Explain concepts clearly when introducing new patterns
- Keep code well-commented
- Prefer simple, readable implementations over clever abstractions
- The UI prototype was built using Magic Patterns and is the source of truth for visual design
- Material UI + Tailwind are both used (MUI for complex components like Accordion/Slider, Tailwind for layout and utility styling)

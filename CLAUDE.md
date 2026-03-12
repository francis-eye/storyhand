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

Phases 1–4 are complete. The app is fully playable with real-time multiplayer, deployed on Railway, and ready for team use.

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
  - Cryptographic ID generation (crypto.randomBytes for sessions, crypto.randomUUID for players)
  - Vote sanitization (hides vote values until reveal phase)
  - 2-minute disconnect grace period with auto-removal
  - Configurable inactivity timeout with periodic checking (every 30s)
  - Re-vote tracking (isReVoting flag)
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

- Custom card decks — T-shirt sizes, powers of 2, etc.
- Session history & export — save results for retrospectives
- Jira integration — pull stories directly into rounds
- Reconnection on page refresh — `reconnect-session` event exists on server but client doesn't persist session/player IDs across refreshes yet
- Re-Vote UX enhancement — the "Re-voting..." chip exists but could retain ticket context

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
| Vote secrecy | Server never broadcasts vote values until host reveals; only hasVoted: true is sent |

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

## Architectural Invariants — Never Violate These

These rules apply to every change, every feature, every bug fix. If a change would break one of these, stop and ask Francis before proceeding.

1. **Server is the single source of truth for game state.** Clients never compute or modify game state locally. They emit events, the server processes them, and clients update only from server responses (callbacks or broadcasts). No optimistic updates on the client.

2. **Vote values are secret until reveal.** The server must NEVER include `vote` values in any broadcast or callback response while `phase !== 'revealed'`. The only voting information shared pre-reveal is `{ playerId, hasVoted: true }`. This applies to `player-joined` (which includes the full player list), `card-played`, and any other event that includes player data. `sessionManager.js` already has vote sanitization — never bypass it.

3. **Host role is sacred.** The `hostId` on a session can only change via the explicit `transfer-host` event initiated by the current host. No other event — including `join-session`, `reconnect-session`, or `disconnect` — should ever reassign `hostId`. If the host disconnects and exceeds the 2-minute grace period, the session has no host until a manual transfer or session expiry.

4. **One player, one entry.** A player must never appear more than once in `session.players`. Every function that adds a player (`addPlayer`, `reconnectPlayer`) must check for duplicates by `playerId` before inserting. Every function that returns the player list must deduplicate as a safety net.

5. **Socket.IO room membership is mandatory.** Every socket that participates in a session MUST call `socket.join(sessionId)`. This applies to `create-session`, `join-session`, AND `reconnect-session`. If a socket is not in the room, it will silently miss all broadcasts. There is no error, no warning — just silence.

6. **Callbacks are for the requesting client. Broadcasts are for everyone else.** When a client emits an event with a callback (like `join-session`), the callback response hydrates that client's state. The broadcast (`player-joined`) updates everyone else. The requesting client should either ignore its own broadcast or the server should use `socket.broadcast.to(sessionId)` instead of `io.to(sessionId)` for that specific event.

7. **Session data is ephemeral.** No persistent database. No writing to disk. All session state lives in memory inside `sessionManager.js` and is purged on session expiry. The only thing persisted client-side is `sessionId` and `playerId` in `sessionStorage` (for reconnection).

## Do Not Touch (Unless Explicitly Asked)

These files and patterns are stable. Do not refactor, rename, reorganize, or "improve" them while working on other tasks.

- **Type definitions (`client/src/types/game.ts`)** — The types are the shared contract between client and server. Changing a type affects everything. If a type change is needed, discuss it first.
- **Card deck values (`FIBONACCI_DECK`)** — The deck is fixed for MVP. Don't add, remove, or reorder values.
- **Tailwind + MUI coexistence** — The project uses both Material UI (for complex components like Accordion, Slider, Snackbar) and Tailwind (for layout and utility styling). This is intentional. Do not migrate one to the other.
- **Vite config (`client/vite.config.ts`)** — Dev proxy for `/socket.io` and `/api` is configured and working. Don't change proxy settings unless the server port changes.
- **Privacy page (`PrivacyPage.tsx`)** — Static content, no logic. Leave it alone.
- **Landing page stats display** — The `/api/stats` endpoint and landing page activity stats are working. Don't modify the stats schema.
- **CSS card flip animation** — The 3D flip in `PlayingCard.tsx` and supporting CSS classes in `index.css` (`perspective-1000`, `transform-style-3d`, `backface-hidden`, `rotate-y-180`) are carefully tuned. Don't simplify or "clean up" the transform chain.

## Coupling Map — If You Change X, Also Check Y

Changes to certain files have ripple effects. Before committing a change, verify the downstream files still work.

```
sessionManager.js (server)
  ├── index.js (server)           — event handlers call sessionManager methods
  │   ├── useGameState.tsx        — client listeners must match emitted event shapes
  │   │   ├── SessionPage.tsx     — reads gameState and currentUser from context
  │   │   ├── GameTable.tsx       — reads gameState.phase and player vote status
  │   │   ├── PlayerRoster.tsx    — reads gameState.players array
  │   │   ├── HostControls.tsx    — reads gameState.phase for button visibility
  │   │   ├── ResultsPanel.tsx    — reads player votes after reveal
  │   │   └── CardDeck.tsx        — reads currentUser.vote for selection state
  │   └── SessionHeader.tsx       — reads gameState.phase, currentRound, isReVoting
  └── game.ts (types)             — shared type contract (Player, GameState, etc.)

If you change...                  Also verify...
─────────────────────────────────────────────────────────────────
sessionManager method signature → index.js handler that calls it
sessionManager return shape     → index.js callback/broadcast payload
                                → useGameState.tsx listener that consumes it

Event payload shape (server)    → useGameState.tsx listener for that event
                                → Any component that reads the affected state

Player type fields              → game.ts, sessionManager, PlayerAvatar, PlayerRoster
GameState fields                → game.ts, sessionManager, every component that reads gameState
GamePhase values                → game.ts, sessionManager, GameTable, HostControls, SessionHeader

Socket.IO event name            → index.js (emit), useGameState.tsx (on), and test files
```

## Definition of Done

A task is not done until ALL of these are true. Do not move to the next task until the current one passes every criterion.

### For Bug Fixes:
1. The specific bug is no longer reproducible using the exact steps from the bug report
2. No OTHER previously-working behavior is broken (test the happy path end-to-end)
3. `cd client && npx tsc -b` passes with zero errors
4. The relevant regression test(s) pass against a running local server
5. Manual verification: open 3 browser windows, create session, join from other 2, play cards, reveal, new round — all state syncs in real-time

### For New Features:
1. The feature works as described in the task or CLAUDE.md specification
2. All existing regression tests still pass
3. At least one new test covers the feature's happy path
4. Edge cases are handled (what if there are 0 players? what if the host disconnects mid-countdown? what if someone joins during reveal phase?)
5. `cd client && npx tsc -b` passes with zero errors
6. No console errors or warnings in browser dev tools during normal usage

### For Refactors:
1. Behavior is identical before and after — the user cannot tell anything changed
2. All existing tests pass without modification (if tests need changes, that's a behavior change, not a refactor)
3. `cd client && npx tsc -b` passes with zero errors

## Error Handling Expectations

Every error should be handled consistently across the stack. Don't swallow errors silently.

### Server → Client Errors (via callback):
All Socket.IO events that use callbacks must return errors in this shape:
```javascript
callback({ error: 'Human-readable error message' });
```
The client (`useGameState.tsx`) should check for `response.error` and surface it in the UI or log it — never ignore it.

**Common error cases to handle:**
- `join-session` with an invalid or expired session ID → `{ error: 'Session not found' }`
- `join-session` when session is full (50 players) → `{ error: 'Session is full' }`
- `play-card` when phase is not 'voting' → `{ error: 'Not in voting phase' }`
- `reveal-cards` / `new-round` / `re-vote` from a non-host → `{ error: 'Only the host can do this' }`
- `reconnect-session` with invalid player/session IDs → `{ error: 'Could not reconnect' }`

### Server-Side Logging:
- Log all errors to console with the event name and session ID: `console.error('[play-card] Session ABC123:', error.message)`
- Log session lifecycle events (created, expired, player removed) at info level
- Do NOT log vote values — they're secret

### Client-Side Error Handling:
- Display join errors in the JoinSessionPage UI (this already exists)
- For in-session errors (e.g., trying to vote in wrong phase), fail silently in the UI but log to console
- Never show raw error objects or stack traces to the user

## Common Claude Code Mistakes to Avoid

These are patterns that have caused issues in this project before. Watch for them.

1. **Adding `socket.on` listeners without cleanup.** Every `socket.on(...)` inside a `useEffect` needs a corresponding `socket.off(...)` in the cleanup function. Without it, listeners stack up on re-renders and events fire multiple times.

2. **Changing event payload shapes without updating both sides.** If you add a field to a server broadcast, the client listener must also be updated. If you rename an event, update the server emit AND the client listener AND the test.

3. **Using `io.to()` when you mean `socket.broadcast.to()`.** `io.to(room).emit()` sends to ALL sockets in the room, including the sender. `socket.broadcast.to(room).emit()` sends to everyone EXCEPT the sender. Using the wrong one is the #1 cause of duplicate state.

4. **Forgetting `socket.join(sessionId)`.** This must happen in create-session, join-session, AND reconnect-session. If any of these paths miss it, that client silently drops out of all broadcasts.

5. **Modifying state in `sessionManager.js` without returning the updated state.** Every mutation method should return the updated session (or relevant slice) so the caller in `index.js` can broadcast it.

6. **Async race conditions in tests.** Always use the `withTimeout` helper for event-based assertions. Bare `await` on a promise that listens for a socket event will hang forever if the event never fires, giving no useful error message.

7. **Skipping the type check.** `npx tsc -b` catches a huge category of errors. Run it before every commit, not just when you think you changed types.

8. **NEVER put TypeScript syntax in `.js` files.** The server is plain JavaScript (`server/index.js`, `server/sessionManager.js`). Type annotations like `(p: any)` or `param: string` will crash Node.js in production. This has caused an actual production outage. If you need to add debug logging to server files, use plain JavaScript only.

9. **Diagnose before fixing.** Before making ANY code change for a bug, read the relevant files and explain the root cause first. Do not guess. Do not jump to a fix based on a theory. Show the specific lines of code that are problematic. Multiple debugging cycles have been wasted by wrong root cause diagnosis (CORS misdiagnosis, targeting wrong component for crown badge fix).

10. **Add diagnostic logging FIRST, not last.** When a bug is unclear, the first action should be adding `console.log` instrumentation — not attempting a fix. Deploy the logging, reproduce the bug, read the logs, THEN fix. This should have been step 1 in every debugging session, not the step we tried after multiple failed fixes.

11. **When editing CLAUDE.md or config files, MERGE — don't replace.** Add new content alongside existing content. Do not overwrite or delete existing sections unless explicitly asked.

## Pre-Commit Checks

Before every commit, run these checks. Do not skip them.

```bash
# 1. No TypeScript syntax in .js files
grep -rn ': string\|: number\|: boolean\|: any\|: void' --include='*.js' server/ && echo 'ERROR: TypeScript annotations found in .js files' && exit 1 || true

# 2. Type check the client
cd client && npx tsc -b

# 3. Verify server syntax
node --check server/index.js
node --check server/sessionManager.js

# 4. Run build to catch any other issues
cd client && npm run build
```

If any step fails, fix it before committing. Do not push broken code.

## Socket.IO Event Reference

### Client → Server:
- `create-session` { settings: GameSettings, hostName: string } → callback with { sessionId, hostId, gameState }
- `join-session` { sessionId: string, role: Role, name?: string } → callback with { playerId, gameState } or error
- `reconnect-session` { sessionId: string, playerId: string } → callback with { gameState } or error
- `play-card` { sessionId: string, playerId: string, value: CardValue }
- `reveal-cards` { sessionId: string } (host only)
- `new-round` { sessionId: string } (host only)
- `re-vote` { sessionId: string } (host only)
- `transfer-host` { sessionId: string, newHostId: string } (host only)
- `leave-session` { sessionId: string, playerId: string }

### Server → Client (broadcast to session):
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

1. Type-check: `cd client && npx tsc -b` — must pass with no errors
2. Start server: `cd server && node index.js` (port 3001)
3. Run integration tests: Use `socket.io-client` (devDep in server/) to simulate multiplayer flows
4. Verify: All Socket.IO events fire correctly, state transitions work, edge cases handled
5. Stop server after tests pass

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

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### 7. Debug With Evidence, Not Theories
- When debugging a production issue, add diagnostic logging FIRST
- Deploy the logging, reproduce the bug, read the logs
- Only after confirming the root cause with evidence, implement the fix
- Never attempt more than one speculative fix without gathering runtime data
- Multiple fix-deploy-fail cycles waste time — one logging deploy saves hours

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.

## Development Notes

- This is a learning project — Francis is picking up React and Node.js through building this
- Explain concepts clearly when introducing new patterns
- Keep code well-commented
- Prefer simple, readable implementations over clever abstractions
- The UI prototype was built using Magic Patterns and is the source of truth for visual design
- Material UI + Tailwind are both used (MUI for complex components like Accordion/Slider, Tailwind for layout and utility styling)

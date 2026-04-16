# Storyhand

**Your team's best hand for agile estimation.**

Deal out story points with confidence. No sign-up required — create a session in seconds and start estimating.

**[Try it live](https://storyhand.up.railway.app)**

---

## What is Storyhand?

Storyhand is a real-time planning poker app for distributed teams. A facilitator creates a session, shares a code, and the team joins to estimate story points using a Fibonacci card deck. Votes stay hidden until everyone's played their hand, then all cards flip at once — reducing bias and keeping estimation honest.

**Zero friction.** No accounts. No downloads. No setup. Just open, share, and point.

## How It Works

```
Facilitator creates session → Shares Session ID → Team joins → Everyone votes → Cards revealed → Next story
```

1. **Create** — Facilitator names the session, enters their display name, and configures settings (voting system, table theme, countdown, timeout)
2. **Share** — A unique 6-character Session ID is generated. Share it via Slack, Zoom, or the invite link
3. **Join** — Team members enter the ID (or use the invite link) and choose to join as a Player or Observer
4. **Vote** — Players pick a card from their deck. All votes are masked (face-down) until reveal
5. **Reveal** — Facilitator flips all cards simultaneously. Average score, consensus, and vote distribution are shown
6. **Repeat** — Re-vote the same item or start a new round for the next story

## Card Deck

```
0 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55 · 89 · ? · ☕
```

| Card | Meaning |
|------|---------|
| `0–89` | Fibonacci point values |
| `?` | Unsure / needs more info |
| `☕` | Away from keyboard |

The `?` and `☕` cards are excluded from average calculations.

## Roles

| Role | What they do |
|------|-------------|
| **Facilitator** | Creates the session and facilitates. Plays cards, reveals votes, starts new rounds, triggers re-votes, kicks players, ends the session. |
| **Player** | Joins with a display name and estimates by playing cards. |
| **Observer** | Watches the session anonymously without voting. |

## Features

- **Real-time multiplayer** — card plays and reveals propagate instantly via WebSockets
- **Session ID joining** — no accounts, no email invites, just a 6-character code or invite link
- **Masked voting** — no anchoring bias, cards stay face-down until the facilitator reveals
- **Vote status summary** — compact floating panel shows who's voted and who's still thinking
- **Re-Vote** — re-estimate the same item after discussion without losing context
- **New Round** — move to the next story with a clean slate
- **Average + Consensus** — see the mean score, whether the team agreed, and high-variance warnings
- **Vote distribution** — bar chart showing how votes spread across point values
- **Countdown animation** — optional 3-2-1 countdown before reveal for last-second votes
- **Dark mode** — system-aware toggle (system / light / dark) with persistent preference
- **Table themes** — Classic green felt and 16-Bit retro pixel art with CRT scanlines
- **Gamification** — achievements (First to Vote, Consensus Streak, Oracle, Hive Mind, Contrarian) with toast notifications and session MVP awards
- **Consensus streak** — tracks consecutive rounds where the team agrees
- **Session summary** — end-of-session stats with total rounds, duration, consensus rate, and MVP categories
- **Feedback system** — in-app sentiment rating (1-5) with optional comments
- **Configurable timeout** — sessions expire after inactivity (default 30 min, adjustable at creation)
- **Disconnect handling** — players get a 2-minute grace period to reconnect before auto-removal
- **Session persistence** — dual storage (sessionStorage + localStorage) with TTL for tab-close recovery
- **Responsive design** — works on desktop, tablet, and mobile with adaptive layouts
- **20-character name limit** — keeps the UI tidy across all screen sizes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Material UI |
| Routing | React Router v7 |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Database | None — all data is in-memory and ephemeral |
| Deployment | Railway (auto-deploys from `main`) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/francis-eye/storyhand.git
cd storyhand

# Start the server
cd server
npm install
npm run dev

# In a second terminal, start the client
cd client
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
cd client && npm run build
cd ../server && NODE_ENV=production node index.js
```

## Architecture

```
storyhand/
├── client/
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── Header.tsx              # Top nav with logo and dark mode toggle
│   │   │   ├── Footer.tsx              # Landing page footer
│   │   │   ├── SessionHeader.tsx       # Game name, round counter, phase chip, invite link
│   │   │   ├── VoteStatusSummary.tsx   # Expandable roster with vote status per player
│   │   │   ├── GameTable.tsx           # Poker table with voted cards and countdown overlay
│   │   │   ├── PlayingCard.tsx         # 3D flip card with theme-aware styling
│   │   │   ├── CardDeck.tsx            # Scrollable tray of 13 Fibonacci cards
│   │   │   ├── GameControls.tsx        # Reveal, re-vote, and new round buttons
│   │   │   ├── ResultsPanel.tsx        # Average, consensus, variance, vote distribution
│   │   │   ├── SessionSummaryCard.tsx  # End-of-session stats and MVPs
│   │   │   ├── AchievementToast.tsx    # Achievement notification popup
│   │   │   ├── LiveSessionDemo.tsx     # Interactive demo on landing page
│   │   │   ├── DarkModeToggle.tsx      # System / light / dark mode switcher
│   │   │   ├── FeedbackModal.tsx       # In-app feedback form
│   │   │   └── FeedbackToast.tsx       # Feedback confirmation toast
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx         # Hero, features, demo, stats, CTAs
│   │   │   ├── CreateGamePage.tsx      # Session creation form with advanced settings
│   │   │   ├── JoinSessionPage.tsx     # Join by ID or invite link, role selection
│   │   │   ├── SessionPage.tsx         # Active game session (main gameplay)
│   │   │   └── PrivacyPage.tsx         # Privacy policy
│   │   ├── hooks/
│   │   │   ├── useGameState.tsx        # Socket.IO client + React Context for all game state
│   │   │   ├── useColorMode.tsx        # Dark mode context and OS-sync logic
│   │   │   ├── useFeedback.tsx         # Feedback modal/toast state and cooldown
│   │   │   └── useIsMobile.ts          # Viewport detection for responsive sizing
│   │   ├── themes/
│   │   │   └── themeRegistry.ts        # ThemeConfig interface + classic/16bit themes
│   │   ├── types/
│   │   │   └── game.ts                 # Shared types: Player, GameState, GamePhase, etc.
│   │   ├── utils/
│   │   │   └── session.ts              # Storage, averages, consensus, avatar colors
│   │   ├── App.tsx                     # Root component with routing
│   │   ├── main.tsx                    # Entry point
│   │   └── index.css                   # Tailwind v4, CSS variables, fonts, animations
│   └── vite.config.ts                  # Tailwind plugin + dev proxy to server
├── server/
│   ├── index.js                        # Express + Socket.IO server + static serving
│   └── sessionManager.js               # In-memory sessions, players, votes, achievements
├── CLAUDE.md                           # AI development context
└── README.md
```

## Socket.IO Events

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-session` | `{ settings, hostName }` | Create a new game session |
| `join-session` | `{ sessionId, role, name? }` | Join an existing session |
| `reconnect-session` | `{ sessionId, playerId }` | Reconnect after disconnect |
| `play-card` | `{ sessionId, playerId, value }` | Play a card (vote) |
| `reveal-cards` | `{ sessionId }` | Flip all cards (facilitator only) |
| `new-round` | `{ sessionId }` | Start next round (facilitator only) |
| `re-vote` | `{ sessionId }` | Re-estimate same item (facilitator only) |
| `transfer-host` | `{ sessionId, newHostId }` | Transfer facilitator role |
| `kick-player` | `{ sessionId, playerId }` | Remove a player (facilitator only) |
| `end-session` | `{ sessionId }` | End the session |
| `leave-session` | `{ sessionId, playerId }` | Leave voluntarily |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `player-joined` | `{ player }` | New player entered the session |
| `player-left` | `{ playerId }` | Player left or was kicked |
| `card-played` | `{ playerId, hasVoted }` | Someone voted (value hidden) |
| `cards-revealed` | `{ players }` | All votes revealed with values |
| `round-reset` | `{ currentRound, isReVote }` | New round or re-vote started |
| `phase-changed` | `{ phase }` | Game phase transition |
| `player-disconnected` | `{ playerId }` | Player lost connection |
| `player-reconnected` | `{ playerId }` | Player reconnected |
| `host-transferred` | `{ oldHostId, newHostId }` | Facilitator role transferred |
| `session-expired` | `{}` | Session timed out |
| `session-ended` | `{ summary }` | Session ended with stats |
| `achievement-earned` | `{ achievement }` | Player earned an achievement |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Server health check with active session count |
| `GET /api/stats` | Daily activity metrics (sessions, players, rounds, active) |

## Design Decisions

| Decision | Resolution |
|----------|-----------|
| Facilitator voting | Facilitator can vote while retaining all host controls |
| Player disconnect | Auto-removed after 2-minute grace period |
| Re-Vote vs New Round | Both supported as distinct actions |
| Session timeout | Default 30 min, configurable at creation |
| Max players | 50 concurrent per session |
| Vote secrecy | Server never broadcasts vote values until reveal |
| Countdown | Client-side 3-2-1 animation; server sets phase immediately |
| Dark mode | System-aware with manual override, persisted in localStorage |
| Themes | Extensible via theme registry (CSS class mappings per component) |

## Roadmap

- [x] Core game flow (create, join, vote, reveal, new round)
- [x] Real-time multiplayer via Socket.IO
- [x] Player disconnect handling with grace period
- [x] Configurable session timeout
- [x] Re-vote support
- [x] Mobile responsive design
- [x] Dark mode (system / light / dark)
- [x] Table themes (Classic, 16-Bit)
- [x] Gamification and achievements
- [x] Session summary with MVPs
- [x] Vote status summary with expandable roster
- [x] Invite links
- [x] Deploy to production (Railway)
- [ ] More table themes (Casino Royale, Sketch/Whiteboard)
- [ ] Custom card decks (T-shirt sizes, powers of 2)
- [ ] Session history and export
- [ ] Jira integration

## License

Copyright 2026 francis-eye

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

Built with ☕ and story points.

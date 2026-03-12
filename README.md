# 🃏 Storyhand

**Your team's best hand for agile estimation.**

Deal out story points with confidence. No sign-up required — create a session in seconds and start estimating.

---

## What is Storyhand?

Storyhand is a real-time planning poker app for distributed teams. A Host creates a session, shares a code, and the team joins to estimate story points using a Fibonacci card deck. Votes stay hidden until everyone's played their hand, then all cards flip at once — reducing bias and keeping estimation honest.

**Zero friction.** No accounts. No downloads. No setup. Just open, share, and point.

## How It Works

```
Host creates session → Shares Session ID → Team joins → Everyone votes → Cards revealed → Next story
```

1. **Create** — Host names the session and picks a voting system (Fibonacci by default)
2. **Share** — A unique Session ID is generated. Share it over Slack, Zoom, wherever
3. **Join** — Team members enter the ID and choose to join as a Player or Observer
4. **Vote** — Players pick a card from their deck. All votes are masked until reveal
5. **Reveal** — Host flips all cards simultaneously. Average score and consensus are shown
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
| **Host** | Creates the session and facilitates. Reveals cards, starts new rounds, triggers re-votes. Does not vote. |
| **Player** | Joins with a display name and estimates by playing cards. |
| **Observer** | Watches the session anonymously without voting. |

## Features

- **Real-time multiplayer** — card plays and reveals propagate instantly
- **Session ID joining** — no accounts, no email invites, just a code
- **Masked voting** — no anchoring bias, cards stay hidden until the Host reveals
- **Re-Vote** — re-estimate the same item after discussion without losing context
- **New Round** — move to the next story with a clean slate
- **Average + Consensus** — see the mean score and whether the team agreed
- **Countdown animation** — optional countdown before reveal for last-second votes
- **Configurable timeout** — sessions expire after 30 minutes of inactivity (adjustable)
- **Responsive** — works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Material UI |
| Backend | Node.js, Express, Socket.IO |
| Database | None — all data is in-memory and ephemeral |

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

### Project Structure

```
storyhand/
├── client/
│   ├── src/
│   │   ├── components/   # CardDeck, GameTable, PlayerRoster, PlayingCard, etc.
│   │   ├── pages/        # LandingPage, CreateGamePage, JoinSessionPage, SessionPage
│   │   ├── hooks/        # useGameState (Socket.IO client + React Context)
│   │   ├── types/        # TypeScript types (game.ts)
│   │   ├── utils/        # Utility functions (session.ts)
│   │   └── App.tsx       # Root component with routing
│   └── vite.config.ts
├── server/
│   ├── index.js          # Express + Socket.IO server
│   ├── sessionManager.js # In-memory session state management
│   └── package.json
├── docs/
├── CLAUDE.md             # AI development context
└── README.md
```

## Roadmap

- [x] UI prototype (React + TypeScript)
- [x] Core game state management
- [x] Game creation, join, and session flows
- [x] Socket.IO backend for real-time multiplayer
- [x] Player disconnection handling (2-min grace period)
- [x] Session inactivity timeout
- [x] Re-vote UX indicator
- [ ] Deploy to production
- [ ] Custom card decks
- [ ] Session history & export
- [ ] Jira integration

## Design Decisions

| Decision | Resolution |
|----------|-----------|
| Host voting | Non-voting facilitator only |
| Player disconnect | Auto-removed after 2-minute grace period |
| Re-Vote vs New Round | Both supported as distinct actions |
| Session timeout | Default 30 min, configurable at creation |
| Max players | 50 concurrent per session |

## License

Copyright © 2026 francis-eye

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

Built with ☕ and story points.

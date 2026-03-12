# BUG REPORT: Real-Time State Synchronization Failures

**Severity:** Critical — Blocks core multiplayer functionality
**Date:** March 2026
**Reported by:** Francis
**Affects:** Socket.IO real-time session state (server broadcast + client listeners)
**Environment:** Production (Railway) and local dev

---

## Summary

The real-time multiplayer experience is fundamentally broken. No client receives live updates from other participants. Rosters are stale, card plays don't propagate, duplicate players appear, and reconnecting causes unintended host transfers. The app only reflects accurate state at the moment of initial join — after that, every client is isolated.

These bugs are almost certainly related and stem from the same root: the Socket.IO broadcast pipeline between `sessionManager.js`, `index.js` (server event handlers), and `useGameState.tsx` (client listeners) is not functioning correctly end-to-end.

---

## Bug 1: All Rosters Are Stale — No Real-Time Updates for Any Client

**Steps to reproduce:**
1. Host (em) creates session "test88" — roster shows only em
2. Player (dev1) joins via Session ID 492FFF
3. em's roster still shows only em. Vote counter says "0 of 1 players voted"
4. Player (dev2) joins. dev1's roster does not update to show dev2
5. No client ever receives a roster update without a full page refresh

**Expected:** When any participant joins, ALL existing clients' rosters update in real-time within 500ms.

**Actual:** Zero clients receive `player-joined` broadcasts. Every client's view is frozen at the state returned by their initial `create-session` or `join-session` callback.

**Where to investigate:**

*Server side (`server/index.js`):*
- After `sessionManager.addPlayer()` completes, is the server calling `io.to(sessionId).emit('player-joined', { player })` ?
- Is `socket.join(sessionId)` being called for BOTH the host (on `create-session`) AND joining players (on `join-session`)? If the host's socket never joins the room, they'll never receive broadcasts.
- Is the broadcast callback wired up in `sessionManager.js`? The CLAUDE.md mentions a "broadcast callback for server-initiated events" — verify it's connected to the actual `io` instance.

*Client side (`useGameState.tsx`):*
- Is there a `socket.on('player-joined', ...)` listener that updates the `gameState.players` array?
- Is the listener registered BEFORE the `create-session` or `join-session` callback returns? If listeners are set up after, early events could be missed.
- Is the listener inside a `useEffect` with proper dependencies, or could it be getting torn down and re-registered, causing missed events?

---

## Bug 2: Duplicate Player Entries in Joining Player's Roster

**Steps to reproduce:**
1. Host (em) creates session
2. Player (dev1) joins
3. dev1's roster shows: HOST: dev1, PLAYERS: em, dev1, dev2 — dev1 appears twice

**Expected:** dev1 appears exactly once, under PLAYERS. em appears as HOST.

**Actual:** dev1 is listed as both HOST and a PLAYER. em is demoted to PLAYERS.

**Where to investigate:**

*Server side:*
- In the `join-session` handler, is the server returning `gameState` from `sessionManager` in the callback AND also emitting `player-joined` to the room? If the joining client receives the full player list in the callback (which already includes themselves) AND also processes the `player-joined` broadcast, they'll add themselves twice.
- Fix: either exclude the joining socket from the broadcast (`socket.broadcast.to(sessionId).emit(...)`) or have the client only use the callback response and ignore `player-joined` for their own player ID.

*Client side:*
- In `useGameState.tsx`, does the `joinGame` function set local state from the callback response AND also have a `player-joined` listener that appends to the player array? If both fire, the joining player is duplicated.
- The `hostId` in the `gameState` returned by the callback may be incorrect — check whether `sessionManager` is returning the correct `hostId` or if it's being overwritten.

---

## Bug 3: Reconnection Triggers Unintended Host Transfer

**Steps to reproduce:**
1. Host (em) creates session, dev1 joins
2. dev1 refreshes the page (disconnect + reconnect)
3. After reconnect, dev1 is shown as HOST; em is demoted to PLAYERS

**Expected:** Reconnecting preserves the player's original role. Host role stays with em. The `reconnect-session` event should restore dev1 as a PLAYER.

**Actual:** Host role is reassigned to dev1 on reconnect.

**Where to investigate:**

*Client side:*
- The CLAUDE.md notes: "client doesn't persist session/player IDs across refreshes yet." This means when dev1 refreshes, the client has no stored `playerId` or `sessionId`. It likely falls through to a `create-session` or `join-session` flow instead of calling `reconnect-session`.
- If the client calls `join-session` again (because it lost its player ID), and the server's `join-session` handler doesn't check for existing players with the same name, it may create a duplicate entry or reassign roles.

*Server side:*
- Does the `join-session` handler check if a player with the same name already exists in the session? If so, it should reconnect them rather than adding a new player.
- The `reconnect-session` event exists on the server — but if the client never calls it (because it lost the player ID from memory), it's dead code. The fix should either: (a) persist `sessionId` and `playerId` in `sessionStorage` so the client can call `reconnect-session` on refresh, or (b) have `join-session` detect and handle re-joining players by name match.

*Server side (`sessionManager.js`):*
- In the `reconnectPlayer` function, verify it's restoring the player's original role from the stored session state and NOT reassigning `hostId`.

---

## Bug 4: Card Plays Do Not Propagate in Real-Time

**Steps to reproduce:**
1. Any player selects a card during the voting phase
2. No other participant sees the face-down card appear
3. Vote counter on other screens does not increment
4. Only a full page refresh shows the updated state

**Expected:** Within 500ms, all other participants see a face-down card appear next to the player's name. The vote counter updates from "0 of N" to "1 of N".

**Actual:** No propagation occurs.

**Where to investigate:**

*Server side:*
- In the `play-card` handler, after `sessionManager.playCard(sessionId, playerId, value)`, is the server broadcasting `card-played` to the room? The broadcast should send `{ playerId, hasVoted: true }` (no vote value — votes are secret until reveal).
- Is `socket.join(sessionId)` being called correctly? If room membership is broken (Bug 1), this will also be broken.

*Client side:*
- Is there a `socket.on('card-played', ...)` listener that updates the matching player's `hasVoted` to `true` in the local `gameState.players` array?
- Vote sanitization: the CLAUDE.md says "server never broadcasts vote values until host reveals; only `hasVoted: true` is sent." Verify the client listener handles this shape correctly and doesn't expect a `vote` field.

---

## Root Cause Analysis

All four bugs share a common thread: **events emitted by the server are not reaching or being processed by clients.** The likely causes, in priority order:

### 1. Socket.IO room membership is broken
This is the most likely single root cause. If `socket.join(sessionId)` is not being called for all participants (especially the host on `create-session`), then `io.to(sessionId).emit(...)` will silently fail — no errors, just no delivery. **Check this first.**

### 2. Client listeners are not registered or are being torn down
If `useGameState.tsx` sets up `socket.on(...)` listeners inside a `useEffect` that has changing dependencies, the listeners may be torn down and re-registered, causing a window where events are missed. Alternatively, if listeners are registered AFTER the initial callback returns, the first set of broadcasts (like `player-joined` for the host's own join) could be missed.

### 3. Dual state update path creates duplicates
If the client updates state from BOTH the callback response AND the broadcast listener for the same event, players appear twice. The recommended fix:
- **Callback:** Use only for the REQUESTING client's initial state hydration (e.g., `joinGame` callback sets the full `gameState`).
- **Broadcasts:** Use for ALL OTHER state changes from other players. The requesting client should either ignore its own broadcast or use `socket.broadcast.to()` on the server side.

### 4. Reconnection falls through to wrong handler
Without persisted `sessionId` and `playerId` in `sessionStorage`, page refresh loses the client's identity. The client then calls `join-session` (or worse, `create-session`) instead of `reconnect-session`, causing duplicates and host reassignment.

---

## Recommended Fix Order

1. **Fix room membership** — ensure `socket.join(sessionId)` is called in both `create-session` and `join-session` handlers on the server. This likely fixes Bugs 1 and 4.
2. **Fix dual state update** — choose one path (callback or broadcast) for the joining client. This fixes Bug 2.
3. **Persist client identity** — store `sessionId` and `playerId` in `sessionStorage`. On mount, check for stored IDs and call `reconnect-session` instead of showing the join page. This fixes Bug 3.
4. **Add regression tests** (see below) to prevent these from recurring.

---

## How to Verify the Fixes

1. **Roster sync:** Open three browser windows. Create session in window 1. Join in windows 2 and 3. ALL three windows should show all 3 participants within 500ms of each join.

2. **No duplicates:** Each participant appears exactly once in every client's roster, under the correct role section (HOST or PLAYERS).

3. **Card play propagation:** Window 2 selects a card. Windows 1 and 3 immediately see a face-down card and the vote counter increments.

4. **Host reveal propagation:** Window 1 (host) clicks "Reveal Cards." Windows 2 and 3 see the countdown (if enabled) and then all cards flip face-up with the results panel.

5. **Reconnection stability:** Refresh window 2. After rejoin, window 1 is still the host. Window 2 appears once in the roster as a player. No host transfer occurs.

6. **Host voting:** Window 1 (host) can see the card deck, select a card, and their vote appears face-down on all other screens.

**Note:** The host CAN vote. The host should see both the card deck and the Host Controls pill.

---

## Regression Test Suite

Add these tests to the server's test setup using `socket.io-client`. These should run before every commit per the QA process in CLAUDE.md.

### Test 1: Room Membership — Host Receives Broadcasts

```javascript
// Verify the host's socket is in the session room and receives player-joined events
test('host receives player-joined when a new player joins', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  // Host creates session
  const { sessionId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  // Host listens for player-joined
  const playerJoinedPromise = new Promise((resolve) => {
    hostSocket.on('player-joined', (data) => resolve(data));
  });

  // Player joins
  await joinSession(playerSocket, { sessionId, role: 'player', name: 'dev1' });

  // Host should receive the event
  const event = await withTimeout(playerJoinedPromise, 2000);
  expect(event.player.name).toBe('dev1');
  expect(event.player.role).toBe('player');

  hostSocket.disconnect();
  playerSocket.disconnect();
});
```

### Test 2: No Duplicate Players on Join

```javascript
// Verify a joining player appears exactly once in the session state
test('joining player appears exactly once in game state', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  const { sessionId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  const { gameState } = await joinSession(playerSocket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });

  // dev1 should appear exactly once
  const dev1Entries = gameState.players.filter((p) => p.name === 'dev1');
  expect(dev1Entries.length).toBe(1);
  expect(dev1Entries[0].role).toBe('player');

  // em should still be host
  const host = gameState.players.find((p) => p.id === gameState.hostId);
  expect(host.name).toBe('em');

  hostSocket.disconnect();
  playerSocket.disconnect();
});
```

### Test 3: Card Play Broadcasts to All Participants

```javascript
// Verify card-played events reach all other clients in the session
test('card play broadcasts to host and other players', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const player1Socket = io(SERVER_URL, { transports: ['websocket'] });
  const player2Socket = io(SERVER_URL, { transports: ['websocket'] });

  const { sessionId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  const { playerId: p1Id } = await joinSession(player1Socket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });
  await joinSession(player2Socket, {
    sessionId,
    role: 'player',
    name: 'dev2',
  });

  // Host and player2 listen for card-played
  const hostReceived = new Promise((resolve) => {
    hostSocket.on('card-played', (data) => resolve(data));
  });
  const player2Received = new Promise((resolve) => {
    player2Socket.on('card-played', (data) => resolve(data));
  });

  // Player1 plays a card
  player1Socket.emit('play-card', {
    sessionId,
    playerId: p1Id,
    value: 5,
  });

  // Both host and player2 should receive the event
  const hostEvent = await withTimeout(hostReceived, 2000);
  const p2Event = await withTimeout(player2Received, 2000);

  expect(hostEvent.playerId).toBe(p1Id);
  expect(hostEvent.hasVoted).toBe(true);
  expect(hostEvent.vote).toBeUndefined(); // Vote value must be secret

  expect(p2Event.playerId).toBe(p1Id);
  expect(p2Event.hasVoted).toBe(true);
  expect(p2Event.vote).toBeUndefined();

  hostSocket.disconnect();
  player1Socket.disconnect();
  player2Socket.disconnect();
});
```

### Test 4: Reconnection Preserves Roles — No Host Transfer

```javascript
// Verify reconnecting a player does not reassign the host role
test('reconnecting player does not steal host role', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  const { sessionId, hostId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  const { playerId } = await joinSession(playerSocket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });

  // Player disconnects
  playerSocket.disconnect();

  // Wait a moment, then reconnect
  await sleep(500);
  const reconnectedSocket = io(SERVER_URL, { transports: ['websocket'] });

  const { gameState } = await reconnectSession(reconnectedSocket, {
    sessionId,
    playerId,
  });

  // Host should still be em
  expect(gameState.hostId).toBe(hostId);
  const host = gameState.players.find((p) => p.id === gameState.hostId);
  expect(host.name).toBe('em');
  expect(host.role).toBe('host');

  // dev1 should be a player, not host
  const dev1 = gameState.players.find((p) => p.id === playerId);
  expect(dev1.role).toBe('player');
  expect(dev1.isConnected).toBe(true);

  // dev1 should appear exactly once
  const dev1Entries = gameState.players.filter((p) => p.name === 'dev1');
  expect(dev1Entries.length).toBe(1);

  hostSocket.disconnect();
  reconnectedSocket.disconnect();
});
```

### Test 5: Vote Secrecy — No Values Leaked Before Reveal

```javascript
// Verify card-played events never include vote values
test('card-played broadcast does not leak vote values', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const player1Socket = io(SERVER_URL, { transports: ['websocket'] });
  const player2Socket = io(SERVER_URL, { transports: ['websocket'] });

  const { sessionId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  const { playerId: p1Id } = await joinSession(player1Socket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });
  await joinSession(player2Socket, {
    sessionId,
    role: 'player',
    name: 'dev2',
  });

  const eventReceived = new Promise((resolve) => {
    player2Socket.on('card-played', (data) => resolve(data));
  });

  player1Socket.emit('play-card', { sessionId, playerId: p1Id, value: 13 });

  const event = await withTimeout(eventReceived, 2000);

  // Must NOT contain vote value
  expect(event.vote).toBeUndefined();
  expect(event.value).toBeUndefined();
  expect(event.hasVoted).toBe(true);
  expect(event.playerId).toBe(p1Id);

  hostSocket.disconnect();
  player1Socket.disconnect();
  player2Socket.disconnect();
});
```

### Test 6: Full Round Trip — Create, Join, Vote, Reveal, New Round

```javascript
// End-to-end happy path for a complete estimation round
test('full round: create → join → vote → reveal → new round', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  // Create
  const { sessionId, hostId } = await createSession(hostSocket, {
    settings: { ...defaultSettings, showCountdown: false },
    hostName: 'em',
  });

  // Join
  const { playerId } = await joinSession(playerSocket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });

  // Both vote
  const hostCardPlayed = new Promise((resolve) => {
    playerSocket.on('card-played', (data) => {
      if (data.playerId === hostId) resolve(data);
    });
  });

  hostSocket.emit('play-card', { sessionId, playerId: hostId, value: 8 });
  playerSocket.emit('play-card', { sessionId, playerId, value: 5 });

  await withTimeout(hostCardPlayed, 2000);

  // Reveal
  const revealReceived = new Promise((resolve) => {
    playerSocket.on('cards-revealed', (data) => resolve(data));
  });

  hostSocket.emit('reveal-cards', { sessionId });

  const revealEvent = await withTimeout(revealReceived, 2000);

  // Now vote values should be visible
  const emVote = revealEvent.players.find((p) => p.id === hostId);
  const dev1Vote = revealEvent.players.find((p) => p.id === playerId);
  expect(emVote.vote).toBe(8);
  expect(dev1Vote.vote).toBe(5);

  // New Round
  const roundReset = new Promise((resolve) => {
    playerSocket.on('round-reset', (data) => resolve(data));
  });

  hostSocket.emit('new-round', { sessionId });

  const resetEvent = await withTimeout(roundReset, 2000);
  expect(resetEvent.currentRound).toBe(2);
  expect(resetEvent.isReVote).toBe(false);

  hostSocket.disconnect();
  playerSocket.disconnect();
});
```

### Test 7: Disconnect Grace Period — Player Removed After 2 Minutes

```javascript
// Verify disconnected players are auto-removed after the grace period
test('disconnected player is removed after 2-minute grace period', async () => {
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  const { sessionId } = await createSession(hostSocket, {
    settings: defaultSettings,
    hostName: 'em',
  });

  await joinSession(playerSocket, {
    sessionId,
    role: 'player',
    name: 'dev1',
  });

  // Host listens for disconnect and removal events
  const disconnectEvent = new Promise((resolve) => {
    hostSocket.on('player-disconnected', (data) => resolve(data));
  });
  const removalEvent = new Promise((resolve) => {
    hostSocket.on('player-left', (data) => resolve(data));
  });

  // Player disconnects
  playerSocket.disconnect();

  // Disconnect event should fire immediately
  const dcEvent = await withTimeout(disconnectEvent, 2000);
  expect(dcEvent.playerId).toBeDefined();

  // Player-left should fire after ~2 minutes (use fake timers in practice)
  // In real tests, use jest.useFakeTimers() and advance by 120000ms
  // const leftEvent = await withTimeout(removalEvent, 130000);
  // expect(leftEvent.playerId).toBe(dcEvent.playerId);

  hostSocket.disconnect();
});
```

### Test Helpers

```javascript
// Helper: create session via callback
function createSession(socket, data) {
  return new Promise((resolve) => {
    socket.emit('create-session', data, (response) => resolve(response));
  });
}

// Helper: join session via callback
function joinSession(socket, data) {
  return new Promise((resolve, reject) => {
    socket.emit('join-session', data, (response) => {
      if (response.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

// Helper: reconnect session via callback
function reconnectSession(socket, data) {
  return new Promise((resolve, reject) => {
    socket.emit('reconnect-session', data, (response) => {
      if (response.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

// Helper: timeout wrapper
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Helper: sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const defaultSettings = {
  gameName: 'Test Session',
  votingSystem: 'fibonacci',
  showAverage: true,
  showCountdown: true,
  inactivityTimeout: 30,
};
```

---

## Related Context

- **CLAUDE.md:** Socket.IO Event Reference section has the full event contract
- **CLAUDE.md:** QA Process section defines the test-before-commit workflow
- **server/sessionManager.js:** Authoritative session state, disconnect timers, vote sanitization
- **client/src/hooks/useGameState.tsx:** Socket.IO client listeners + React Context state
- **Design note:** Host CAN vote. Host sees both the card deck and Host Controls.

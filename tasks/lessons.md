# Lessons Learned

Patterns and mistakes to avoid. Review at the start of each session.

---

## 1. Socket.IO CORS: `cors: {}` is not the same as `cors: false`

**What happened:** Production broadcasts only reached the host. Players never received any events. Code was correct — `socket.join()` was called in all the right places, tests passed locally.

**Root cause:** `cors: {}` in the Socket.IO server config applies restrictive CORS defaults that silently break WebSocket connections. In production, where client and server are same-origin (Express serves the React build), CORS isn't needed at all.

**The fix:** `cors: false` in production, explicit origin whitelist in dev.

**Lesson:** When debugging Socket.IO broadcast failures, check transport/connection health before application logic. Verify sockets are actually connected (not just that the code calls `socket.join`). In production, if client and server are same-origin, set `cors: false` — don't pass an empty object.

**How to apply:** Any time Socket.IO events aren't reaching clients, check these in order:
1. Is the socket actually connected? (transport/CORS/proxy)
2. Is the socket in the room? (`socket.join` called?)
3. Is the event being emitted correctly? (`io.to` vs `socket.to` vs `socket.broadcast.to`)
4. Is the client listener registered? (`socket.on` with cleanup in `useEffect`)

Don't skip to step 2-4 assuming step 1 is fine just because the code looks right.

---

## 2. Dedup broadcasts on the client as a safety net

**What happened:** The last player to join occasionally appeared twice in the roster.

**Root cause:** Race condition between the `join-session` callback (which sets full game state including the new player) and the `player-joined` broadcast (which appends the player). Even with `socket.to()` excluding the sender, edge cases can cause duplicates.

**The fix:** Added a dedup guard in the `player-joined` listener — skip if player ID already exists in state.

**Lesson:** Server-side `socket.to()` vs `io.to()` is necessary but not sufficient. Always dedup on the client as belt-and-suspenders.

---

## 3. Delay host promotion on disconnect to survive page refresh

**What happened:** When the host refreshed their browser, `immediateHostPromote` fired instantly on disconnect, demoting them before the reconnect could complete.

**Root cause:** The disconnect handler promoted a new host with zero delay. Page refresh = disconnect + reconnect within ~1 second, but the promotion happened in 0ms.

**The fix:** 5-second delay before host promotion. `reconnectPlayer` cancels the timer if the host comes back. Promotion broadcasts via `onBroadcast` callback after the delay.

**Lesson:** Any "immediate" action triggered by disconnect should consider that refreshes cause a disconnect→reconnect cycle. Add a short grace period for destructive role changes.

---

## 4. Do not assume — verify with actual runtime data before "fixing"

**What happened:** Crown badges showed on all players in the host's view only. First fix attempt changed `PlayerAvatar` to use `player.id === hostId` instead of `player.role === 'host'`. The fix was deployed but the bug persisted. The actual root cause was never confirmed with runtime data before writing the fix.

**Lesson:** When a bug report says "X is wrong in Y's view," do NOT guess the cause from reading code. Instead:
1. Add a `console.log` that dumps the actual state values in the affected component
2. Reproduce the bug and read the log output
3. Only then write the fix based on observed data, not assumed data

The cost of one extra deploy with a debug log is far less than shipping a "fix" that doesn't fix anything. Theory-based debugging has failed multiple times in this project (CORS, dual socket, crown badge). Always get runtime evidence first.

**How to apply:** Before writing any bug fix, ask: "Have I seen the actual values that cause this bug, or am I guessing?" If guessing, add instrumentation first.

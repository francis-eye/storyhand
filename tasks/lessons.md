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

---

## 5. server/ is plain JavaScript — no TypeScript syntax

**What happened:** Added `(p: any)` type annotation in a debug log line in `server/index.js`. This crashed production because Node.js cannot parse TypeScript syntax.

**Lesson:** The server directory is plain `.js` files, not TypeScript. Never use type annotations (`: type`), `as` casts, or angle-bracket generics in server code.

**How to apply:** Before committing changes to `server/`, mentally check: "Did I write any TypeScript syntax in a `.js` file?" The client (`client/src/`) is TypeScript; the server (`server/`) is not.

---

## 6. Socket.IO + React: socket must be a module-scope singleton

**What happened:** The host browser created 2 Socket.IO connections. The session was on the second socket but event listeners were registered on the first. Result: the host worked fine (emits went out on socket 2, callbacks came back on socket 2) but broadcasts from the server landed on socket 1 where no listeners existed. Players received nothing.

**Root cause:** The socket was created inside a `useCallback` in the React component. React's `StrictMode` double-mounts components in dev, and even in production, the component lifecycle created multiple socket instances. The `useRef` approach didn't protect against this because the ref was scoped to the component, not the module.

**The fix:** Moved `const socket = io({ autoConnect: false, transports: ['websocket'] })` to module scope at the top of `useGameState.tsx`, outside the component. This guarantees exactly one socket per browser tab regardless of React lifecycle. Also removed `<StrictMode>` from `main.tsx`.

**Lesson:** Any resource that must be a singleton (socket connections, WebRTC peers, service workers) should live at module scope, not inside a React component. React gives no guarantees about how many times a component mounts, unmounts, or re-renders.

**How to apply:** If you're creating a connection or resource that should exist exactly once, put it at module scope. If it needs configuration from props/state, create it at module scope with `autoConnect: false` and connect it imperatively when ready.

---

## 7. socket.join() must be unconditional and first

**What happened:** In the `join-session` handler, `socket.join(sessionId)` was called after validation logic. If validation returned early (e.g., player already existed), the socket never joined the room and silently missed all broadcasts.

**Root cause:** Transport upgrades (polling → websocket) create a new socket with a new ID. The new socket emits `join-session` again, but `sessionManager.joinSession` may see the player already exists and return early — before `socket.join()` was reached.

**The fix:** Moved `socket.join(sessionId)` to the very first line of both `join-session` and `reconnect-session` handlers, before any validation or early returns. Room membership is now unconditional.

**Lesson:** `socket.join()` is about transport plumbing, not application logic. It should never be gated behind validation. A socket that isn't in the room is invisible — no errors, no warnings, just silence.

**How to apply:** In any Socket.IO event handler that involves a room, call `socket.join(roomId)` as the absolute first line. Never put it after conditionals that might skip it.

---

## 8. Distinguish UI elements that look the same but mean different things

**What happened:** The transfer-host button used a 👑 emoji next to each player in the roster. The host badge on avatars also used 👑. In the host's view, every player appeared to have a crown — but it was two different UI elements (badge vs. button) using the same icon. Reported as "all players show crown badges."

**Root cause:** Visual ambiguity. The transfer-host button only renders when `isCurrentUserHost` is true, so only the host saw it — matching the "only in host's view" symptom perfectly. We wasted a fix cycle changing the badge logic when the badge was never the problem.

**The fix:** Changed the transfer-host button icon from 👑 to ↑ (promote arrow).

**Lesson:** If two different UI elements use the same icon/visual, they will be confused. Especially when one is conditional (only visible to certain users), bug reports will describe the symptom but not distinguish which element is the source. Before debugging logic, check whether there are multiple renderings of the same visual in the component tree.

**How to apply:** When a bug report says "icon X appears where it shouldn't," search the entire codebase for every place that icon is rendered (not just the one you think is wrong). `grep -r '👑'` would have found both immediately.

---

## 9. Clean up debug logging before it ships to production

**What happened:** We added diagnostic logging multiple times during the broadcast investigation. Each round required a commit, push, Railway deploy, reproduce, read logs, then a follow-up cleanup commit. One round introduced a TypeScript annotation that crashed production (lesson #5).

**Lesson:** Debug logging is a tool, not a feature. It carries risk:
- TypeScript syntax in JS files (lesson #5)
- Verbose logs in production pollute Railway log streams
- Each cleanup pass is another deploy cycle

**How to apply:**
1. When adding debug logs, mark them clearly: `// TEMP DEBUG — remove after diagnosis`
2. Keep debug logging minimal and focused — log the specific values you need, not everything
3. Remove all debug logging in the same PR as the fix, not in a follow-up
4. Before committing any `console.log` in `server/`, check for TypeScript syntax

---

## 10. Theory-based debugging has a poor track record in this project

**What happened:** Across the broadcast investigation, we made 4+ "fix" commits before identifying the actual root cause (dual socket). Each was based on reading code and theorizing about what was wrong:
1. CORS config change — didn't fix it
2. socket.join() placement — partial improvement but not the root cause
3. Crown badge logic change — wrong element entirely
4. The actual fix (module-scope socket) came after deploying diagnostic logging and reading production evidence

**Lesson:** This project's bugs live at the intersection of Socket.IO, React lifecycle, and production infrastructure (Railway, transport upgrades). These interactions are too subtle to reason about from code alone. The debugging protocol should be:
1. **Instrument** — add targeted logging to see actual runtime values
2. **Reproduce** — trigger the bug in production (or locally if possible)
3. **Read** — look at the actual log output, not what you expect it to say
4. **Fix** — write the fix based on evidence
5. **Verify** — confirm the fix works in the same environment where you observed the bug

**How to apply:** Resist the urge to "just try this fix." If you can't explain exactly why the fix works based on observed data, you're guessing.

---

## 11. Always test locally before deploying to production

**What happened:** Multiple commits were pushed directly to main and auto-deployed to Railway without local verification. This led to a production outage (TypeScript in .js file) and multiple fix-deploy-fail cycles that could have been caught locally.

**Lesson:** After integration tests pass, always start the server and client locally, open browser windows, and manually verify the change works before pushing to main. The deploy pipeline (push → Railway auto-deploy) is one-way — broken code goes straight to production.

**How to apply:** The workflow for every change is:
1. Run integration tests (`cd server && npm test`)
2. Type-check (`cd client && npx tsc -b`)
3. Start server + client locally, open 3 browser windows, verify the change works end-to-end
4. Only then commit and push to main

---

## 12. The server is settings-agnostic — use that

**What happened:** When implementing game table themes, we added a `tableTheme` field to `GameSettings`. Zero server changes were needed — `sessionManager.js` stores and returns `settings` as-is, and `index.js` passes it through unchanged.

**Lesson:** The server's settings pass-through design means any new client-side feature that only needs a setting stored and broadcast can be added by:
1. Adding the field to `GameSettings` in `game.ts`
2. Adding the UI control in `CreateGamePage.tsx`
3. Reading it from `state.settings` in session components

No server code, no new Socket.IO events, no new handlers. This is a strength of the architecture — don't break it by putting settings validation or transformation in the server unless absolutely necessary.

**How to apply:** Before touching server code for a new feature, ask: "Can this be a settings field that passes through?" If yes, keep it client-only.

---

## 13. CSS class string registries are a clean theming pattern

**What happened:** Implemented a theme system using a TypeScript registry (`themeRegistry.ts`) that maps theme IDs to objects full of Tailwind CSS class strings. Components receive a `theme: ThemeConfig` prop and swap their hardcoded classes for `theme.x.y`. Classic theme maps to the exact original classes — zero visual change.

**Lesson:** This pattern works well because:
- No CSS variables, no runtime style computation, no separate component trees
- Adding a new theme = adding one new object to the registry
- Components stay simple — they just apply class strings from the theme config
- TypeScript catches missing theme fields at compile time

**How to apply:** When adding visual variants to components, prefer a config object of class strings over conditional logic scattered across components. Keep the config centralized in one file.

---

## 14. Plan mode + local testing = zero production incidents

**What happened:** This session implemented two features (mobile responsive layout + game table themes) across 13+ files with zero production incidents. Both features were planned in plan mode, type-checked, tested locally, and verified before pushing.

**Lesson:** The previous session had multiple production incidents from shipping untested code. This session had none because we followed the protocol: plan → implement → type-check → test locally → push. The extra 5 minutes of local testing saves hours of fix-deploy-fail cycles.

**How to apply:** This is the protocol. No exceptions. The temptation to "just push it" is always wrong.

---

## 15. Verify the production URL by hitting it before baking it into anything durable

**What happened:** Shipped the Phase 5 SEO + agentic-discovery foundation with the wrong canonical URL — `storyhand.up.railway.app` baked into 13 places (og:url, og:image, twitter:image, canonical link, JSON-LD `url`, four sitemap `<loc>` entries, robots.txt sitemap line, two llms.txt URLs, README live link). The actual Railway URL is `storyhand-production.up.railway.app`. Discovered when Slack refused to unfurl: every unfurler was fetching `storyhand.up.railway.app`, getting Railway's edge 404 (`x-railway-fallback: true`), and aborting. CLAUDE.md and the existing README both showed the wrong URL, so the assumption flowed straight through.

**Root cause:** I trusted the README's "Try it live" link as authoritative without `curl -I`-ing it before referencing it across the codebase. The README itself had inherited the wrong URL silently — probably set up early when the Railway service was first named. Documentation drift compounded the error.

**Lesson:** Whenever a URL, hostname, port, account name, or any other external identifier is going to be referenced in more than one file, hit the actual endpoint first. `curl -I https://...` takes one second and catches: typos, retired domains, wrong subdomains, expired certs, dead services. Don't propagate a string from documentation into code without proving the string resolves to the live thing.

**How to apply:** Before writing meta tags, OG/Twitter cards, JSON-LD, sitemaps, robots.txt, llms.txt, README badges, deep links, OAuth redirect URIs, webhook destinations, or any other identifier that other systems will fetch — `curl -I` it first. Treat existing documentation references as unverified hints, not facts. If a value lives in 5+ places, it should also live in one place: a build-time constant or env var that makes future migrations one-line edits, not 13.

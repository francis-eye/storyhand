import crypto from 'node:crypto';

/**
 * In-memory store for all active Storyhand sessions.
 *
 * Each session is keyed by a 6-char alphanumeric ID and holds
 * the full game state: settings, phase, players, round counter.
 */
const DISCONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes before auto-remove
const INACTIVITY_CHECK_INTERVAL_MS = 30 * 1000; // check every 30 seconds

export class SessionManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.sessions = new Map();

    // Daily stats — resets at midnight
    this.stats = { sessionsCreated: 0, playersJoined: 0, roundsPlayed: 0, date: this.todayString() };

    // Timers for disconnected player auto-removal: Map<"sessionId:playerId", timeout>
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    this.disconnectTimers = new Map();

    // Callback set by the server to handle auto-removal broadcasts
    /** @type {((sessionId: string, event: string, data: object) => void) | null} */
    this.onBroadcast = null;

    // Start periodic inactivity check
    this.inactivityInterval = setInterval(() => this.checkInactiveSessions(), INACTIVITY_CHECK_INTERVAL_MS);
  }

  // --- ID generation (cryptographically random) ---

  generateSessionId() {
    // 3 random bytes → 6 hex chars, uppercased
    let id;
    do {
      id = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (this.sessions.has(id)); // avoid collisions
    return id;
  }

  generatePlayerId() {
    return crypto.randomUUID();
  }

  // --- Session lifecycle ---

  createSession(settings, hostName) {
    const sessionId = this.generateSessionId();
    const hostId = this.generatePlayerId();

    const host = {
      id: hostId,
      name: hostName,
      role: 'host',
      vote: null,
      hasVoted: false,
      isConnected: true,
      disconnectedAt: null,
      socketId: null, // set when socket connects
    };

    const session = {
      sessionId,
      settings,
      phase: 'voting',
      players: new Map([[hostId, host]]),
      currentRound: 1,
      hostId,
      isReVoting: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    this.checkStatsReset();
    this.stats.sessionsCreated++;

    return { sessionId, hostId, gameState: this.getGameState(sessionId) };
  }

  joinSession(sessionId, role, name, socketId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    const playerId = this.generatePlayerId();
    const player = {
      id: playerId,
      name: name || 'Observer',
      role,
      vote: null,
      hasVoted: false,
      isConnected: true,
      disconnectedAt: null,
      socketId,
    };

    session.players.set(playerId, player);
    session.lastActivityAt = Date.now();

    this.checkStatsReset();
    this.stats.playersJoined++;

    // Transition from waiting → voting when first player joins
    if (session.phase === 'waiting' && role === 'player') {
      session.phase = 'voting';
    }

    return {
      playerId,
      player: this.sanitizePlayer(player, session.phase),
      gameState: this.getGameState(sessionId),
    };
  }

  // --- Game actions ---

  playCard(sessionId, playerId, value) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.phase !== 'voting') return { error: 'Not in voting phase' };

    const player = session.players.get(playerId);
    if (!player) return { error: 'Player not found' };
    if (player.role !== 'player' && player.role !== 'host') return { error: 'Only players and hosts can vote' };

    player.vote = value;
    player.hasVoted = true;
    session.lastActivityAt = Date.now();

    return { playerId, hasVoted: true };
  }

  revealCards(sessionId, requesterId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.hostId !== requesterId) return { error: 'Only the host can reveal' };

    session.phase = 'revealed';
    session.lastActivityAt = Date.now();

    // Return full player data with votes exposed
    const players = Array.from(session.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      vote: p.vote,
      hasVoted: p.hasVoted,
      isConnected: p.isConnected,
      disconnectedAt: p.disconnectedAt,
    }));

    return { players };
  }

  newRound(sessionId, requesterId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.hostId !== requesterId) return { error: 'Only the host can start a new round' };

    session.currentRound += 1;
    this.resetVotes(session);

    this.checkStatsReset();
    this.stats.roundsPlayed++;

    return { currentRound: session.currentRound, isReVote: false };
  }

  reVote(sessionId, requesterId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.hostId !== requesterId) return { error: 'Only the host can trigger re-vote' };

    this.resetVotes(session);
    session.isReVoting = true; // flag stays until next newRound or reveal

    return { currentRound: session.currentRound, isReVote: true };
  }

  // --- Connection management ---

  setSocketId(sessionId, playerId, socketId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const player = session.players.get(playerId);
    if (player) {
      player.socketId = socketId;
    }
  }

  disconnectPlayer(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const player = session.players.get(playerId);
    if (!player) return null;

    player.isConnected = false;
    player.disconnectedAt = Date.now();

    // Host disconnect: promote another player immediately so the session isn't blocked.
    // The old host stays in the session as a disconnected player (2-min grace period to reconnect).
    if (player.role === 'host') {
      const promoted = this.immediateHostPromote(sessionId, playerId);

      // Start 2-min grace period to auto-remove the disconnected (now demoted) player
      const timerKey = `${sessionId}:${playerId}`;
      if (this.disconnectTimers.has(timerKey)) {
        clearTimeout(this.disconnectTimers.get(timerKey));
      }
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(timerKey);
        this.autoRemovePlayer(sessionId, playerId);
      }, DISCONNECT_GRACE_MS);
      this.disconnectTimers.set(timerKey, timer);

      return { playerId, promoted };
    }

    // Non-host: standard 2-minute grace period before auto-removal
    const timerKey = `${sessionId}:${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey));
    }
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(timerKey);
      this.autoRemovePlayer(sessionId, playerId);
    }, DISCONNECT_GRACE_MS);
    this.disconnectTimers.set(timerKey, timer);

    return { playerId };
  }

  reconnectPlayer(sessionId, playerId, newSocketId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const player = session.players.get(playerId);
    if (!player) return null;

    player.isConnected = true;
    player.disconnectedAt = null;
    player.socketId = newSocketId;

    // Cancel the auto-removal timer
    const timerKey = `${sessionId}:${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey));
      this.disconnectTimers.delete(timerKey);
    }

    return { playerId };
  }

  // Called automatically after 2-min disconnect grace period
  autoRemovePlayer(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const player = session.players.get(playerId);
    if (!player || player.isConnected) return; // reconnected in time

    session.players.delete(playerId);
    console.log(`Auto-removed player ${player.name} (${playerId}) from session ${sessionId} after disconnect timeout`);

    // Notify via broadcast callback
    if (this.onBroadcast) {
      this.onBroadcast(sessionId, 'player-left', { playerId });
    }
  }

  // Called immediately when host disconnects — demotes them to player and promotes another
  // Returns { newHostId } if promotion succeeded, null if no one available
  immediateHostPromote(sessionId, hostPlayerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const nextHost = Array.from(session.players.values()).find(
      p => p.id !== hostPlayerId && p.role === 'player' && p.isConnected
    );

    if (!nextHost) return null;

    // Demote old host to player (they stay in session for reconnect)
    const oldHost = session.players.get(hostPlayerId);
    oldHost.role = 'player';

    // Promote new host
    nextHost.role = 'host';
    session.hostId = nextHost.id;
    console.log(`Immediately promoted ${nextHost.name} (${nextHost.id}) to host in session ${sessionId} after host disconnect`);

    return { newHostId: nextHost.id };
  }

  leaveSession(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };

    if (session.hostId === playerId) {
      // Try to promote another connected player before destroying
      const nextHost = Array.from(session.players.values()).find(
        p => p.id !== playerId && p.role === 'player' && p.isConnected
      );

      if (nextHost) {
        session.players.delete(playerId);
        nextHost.role = 'host';
        session.hostId = nextHost.id;
        return { playerId, sessionDestroyed: false, newHostId: nextHost.id };
      }

      // No one to promote — destroy
      this.sessions.delete(sessionId);
      return { playerId, sessionDestroyed: true };
    }

    session.players.delete(playerId);
    return { playerId, sessionDestroyed: false };
  }

  // --- State queries ---

  /**
   * Returns a sanitized GameState for clients.
   * During voting/waiting/countdown, vote values are hidden.
   * During revealed, votes are included.
   */
  getGameState(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const players = Array.from(session.players.values()).map(p =>
      this.sanitizePlayer(p, session.phase)
    );

    return {
      sessionId: session.sessionId,
      settings: session.settings,
      phase: session.phase,
      players,
      currentRound: session.currentRound,
      hostId: session.hostId,
      isReVoting: session.isReVoting,
      countdownValue: null, // countdown is client-side only
    };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  // Find which session a socket belongs to (for disconnect handling)
  findBySocketId(socketId) {
    for (const [sessionId, session] of this.sessions) {
      for (const [playerId, player] of session.players) {
        if (player.socketId === socketId) {
          return { sessionId, playerId };
        }
      }
    }
    return null;
  }

  // --- Inactivity timeout ---

  checkInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      const timeoutMs = (session.settings.inactivityTimeout || 30) * 60 * 1000;
      if (now - session.lastActivityAt > timeoutMs) {
        console.log(`Session ${sessionId} expired due to inactivity (${session.settings.inactivityTimeout} min)`);
        this.sessions.delete(sessionId);

        // Clean up any disconnect timers for this session
        for (const [key, timer] of this.disconnectTimers) {
          if (key.startsWith(`${sessionId}:`)) {
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
          }
        }

        if (this.onBroadcast) {
          this.onBroadcast(sessionId, 'session-expired', {});
        }
      }
    }
  }

  // --- Stats ---

  todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  // Reset stats if the date has changed
  checkStatsReset() {
    const today = this.todayString();
    if (this.stats.date !== today) {
      this.stats = { sessionsCreated: 0, playersJoined: 0, roundsPlayed: 0, date: today };
    }
  }

  getStats() {
    this.checkStatsReset();
    return { ...this.stats, activeSessions: this.sessions.size };
  }

  // --- Host transfer ---

  transferHost(sessionId, requesterId, newHostId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.hostId !== requesterId) return { error: 'Only the host can transfer' };

    const newHost = session.players.get(newHostId);
    if (!newHost) return { error: 'Player not found' };
    if (newHost.role !== 'player') return { error: 'Can only transfer to a player' };

    const oldHost = session.players.get(requesterId);
    oldHost.role = 'player';
    newHost.role = 'host';
    session.hostId = newHostId;
    session.lastActivityAt = Date.now();

    return { oldHostId: requesterId, newHostId };
  }

  // --- Helpers ---

  resetVotes(session) {
    session.phase = 'voting';
    session.isReVoting = false;
    session.lastActivityAt = Date.now();
    for (const player of session.players.values()) {
      player.vote = null;
      player.hasVoted = false;
    }
  }

  sanitizePlayer(player, phase) {
    return {
      id: player.id,
      name: player.name,
      role: player.role,
      // Only expose vote values when revealed
      vote: phase === 'revealed' ? player.vote : null,
      hasVoted: player.hasVoted,
      isConnected: player.isConnected,
      disconnectedAt: player.disconnectedAt,
    };
  }
}

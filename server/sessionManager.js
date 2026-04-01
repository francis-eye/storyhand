import crypto from 'node:crypto';

/**
 * In-memory store for all active Storyhand sessions.
 *
 * Each session is keyed by a 6-char alphanumeric ID and holds
 * the full game state: settings, phase, players, round counter.
 */
const DISCONNECT_GRACE_MS = 5 * 60 * 1000; // 5 minutes before auto-remove
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
    const facilitatorId = this.generatePlayerId();

    const host = {
      id: facilitatorId,
      name: hostName,
      role: 'facilitator',
      vote: null,
      hasVoted: false,
      isConnected: true,
      disconnectedAt: null,
      socketId: null, // set when socket connects
      stats: {
        firstToVoteCount: 0,
        achievementCount: 0,
        closestToAverageCount: 0,
        afkCount: 0,
        voteTimestamps: [],
      },
    };

    const session = {
      sessionId,
      settings,
      phase: 'voting',
      players: new Map([[facilitatorId, host]]),
      currentRound: 1,
      facilitatorId,
      isReVoting: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      stats: {
        consensusStreak: 0,
        bestStreak: 0,
        roundStartTime: Date.now(),
        consensusRounds: 0,
        totalRevealedRounds: 0,
        achievements: [],
        firstVoterId: null,
      },
    };

    this.sessions.set(sessionId, session);

    this.checkStatsReset();
    this.stats.sessionsCreated++;

    return { sessionId, facilitatorId, gameState: this.getGameState(sessionId) };
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
      stats: {
        firstToVoteCount: 0,
        achievementCount: 0,
        closestToAverageCount: 0,
        afkCount: 0,
        voteTimestamps: [],
      },
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
    if (player.role !== 'player' && player.role !== 'facilitator') return { error: 'Only players and facilitators can vote' };

    // null value = unplay (deselect) the card
    if (value === null) {
      player.vote = null;
      player.hasVoted = false;
    } else {
      player.vote = value;
      player.hasVoted = true;
      player.stats.voteTimestamps.push(Date.now());
      if (value === '☕') {
        player.stats.afkCount++;
      }
      if (!session.stats.firstVoterId) {
        session.stats.firstVoterId = playerId;
      }
    }
    session.lastActivityAt = Date.now();

    const autoRevealResult = this.checkAutoReveal(session);
    return { playerId, hasVoted: player.hasVoted, autoReveal: autoRevealResult };
  }

  checkAutoReveal(session) {
    if (session.phase !== 'voting') return null;

    const activePlayers = Array.from(session.players.values()).filter(
      p => (p.role === 'player' || p.role === 'facilitator') && p.isConnected
    );
    const allVoted = activePlayers.length > 0 && activePlayers.every(p => p.hasVoted);

    if (!allVoted) return null;

    session.phase = 'revealed';
    session.lastActivityAt = Date.now();

    const achievement = this.computeAchievement(session);

    const players = Array.from(session.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      vote: p.vote,
      hasVoted: p.hasVoted,
      isConnected: p.isConnected,
      disconnectedAt: p.disconnectedAt,
    }));

    return { players, achievement };
  }

  computeAchievement(session) {
    const voters = Array.from(session.players.values()).filter(
      p => (p.role === 'player' || p.role === 'facilitator') && p.hasVoted
    );
    if (voters.length === 0) return null;

    const votes = voters.map(p => p.vote);
    const numericVotes = votes.filter(v => typeof v === 'number');

    // Check consensus
    const isConsensus = numericVotes.length === voters.length &&
      numericVotes.every(v => v === numericVotes[0]);

    // Update streak
    if (isConsensus) {
      session.stats.consensusStreak++;
      session.stats.consensusRounds++;
      if (session.stats.consensusStreak > session.stats.bestStreak) {
        session.stats.bestStreak = session.stats.consensusStreak;
      }
    } else {
      session.stats.consensusStreak = 0;
    }
    session.stats.totalRevealedRounds++;

    // Compute closest-to-average for player stats
    if (numericVotes.length > 0) {
      const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      let closestPlayer = null;
      let closestDiff = Infinity;
      for (const v of voters) {
        if (typeof v.vote === 'number') {
          const diff = Math.abs(v.vote - avg);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestPlayer = v;
          }
        }
      }
      if (closestPlayer) {
        closestPlayer.stats.closestToAverageCount++;
      }
    }

    // Track first-to-vote player stat
    if (session.stats.firstVoterId) {
      const firstVoter = session.players.get(session.stats.firstVoterId);
      if (firstVoter) {
        firstVoter.stats.firstToVoteCount++;
      }
    }

    // FIBONACCI sequence for "near miss" check
    const FIB = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

    // Determine achievement by priority
    let achievement = null;

    // Priority 1: Streak milestones (override Hive Mind)
    if (isConsensus && session.stats.consensusStreak >= 10) {
      achievement = { id: 'legendary', icon: '🏆', title: 'Legendary', description: '10 consecutive consensus rounds' };
    } else if (isConsensus && session.stats.consensusStreak >= 5) {
      achievement = { id: 'unstoppable', icon: '🔥🔥', title: 'Unstoppable', description: '5 in a row, this team gets it' };
    } else if (isConsensus && session.stats.consensusStreak >= 3) {
      achievement = { id: 'on-fire', icon: '🔥', title: 'On Fire', description: '3 consensus rounds in a row' };
    } else if (isConsensus) {
      // Priority 1: Hive Mind (standard consensus)
      achievement = { id: 'hive-mind', icon: '🤝', title: 'Hive Mind', description: 'Full consensus — everyone played the same card' };
    }

    if (!achievement) {
      // Priority 2: Near Miss — all votes within 1 Fibonacci step
      if (numericVotes.length >= 2) {
        const indices = numericVotes.map(v => FIB.indexOf(v)).filter(i => i !== -1);
        if (indices.length === numericVotes.length) {
          const maxIdx = Math.max(...indices);
          const minIdx = Math.min(...indices);
          if (maxIdx - minIdx <= 1) {
            achievement = { id: 'near-miss', icon: '🎯', title: 'Near Miss', description: 'All votes within one step of each other' };
          }
        }
      }
    }

    if (!achievement) {
      // Priority 3: The Contrarian — exactly one outlier
      if (numericVotes.length >= 3) {
        const voteCounts = new Map();
        voters.forEach(v => {
          const key = String(v.vote);
          voteCounts.set(key, (voteCounts.get(key) || 0) + 1);
        });
        const singles = [];
        for (const [val, count] of voteCounts) {
          if (count === 1) singles.push(val);
        }
        if (singles.length === 1) {
          const contrarian = voters.find(v => String(v.vote) === singles[0]);
          if (contrarian) {
            achievement = { id: 'contrarian', icon: '🔮', title: 'The Contrarian', description: `${contrarian.name} voted differently from everyone`, playerId: contrarian.id };
          }
        }
      }
    }

    if (!achievement && session.stats.firstVoterId) {
      // Priority 4: First to Vote
      const firstVoter = session.players.get(session.stats.firstVoterId);
      if (firstVoter) {
        achievement = { id: 'first-to-vote', icon: '⚡', title: 'First to Vote', description: `${firstVoter.name} played their card first`, playerId: firstVoter.id };
      }
    }

    if (!achievement) {
      // Priority 5: The Holdout — last voter (only if auto-reveal triggered, which it always does now)
      // Find the voter who voted last by timestamp
      const votersWithTimestamps = voters.filter(v => v.stats.voteTimestamps.length > 0);
      if (votersWithTimestamps.length >= 2) {
        const lastVoter = votersWithTimestamps.reduce((latest, v) => {
          const lastTs = v.stats.voteTimestamps[v.stats.voteTimestamps.length - 1];
          const latestTs = latest.stats.voteTimestamps[latest.stats.voteTimestamps.length - 1];
          return lastTs > latestTs ? v : latest;
        });
        achievement = { id: 'holdout', icon: '🐢', title: 'The Holdout', description: `${lastVoter.name} was the last to vote`, playerId: lastVoter.id };
      }
    }

    if (!achievement) {
      // Priority 6: Speed Round — all voted within 10 seconds of round start
      if (session.stats.roundStartTime && voters.length >= 2) {
        const allFast = voters.every(v => {
          const lastTs = v.stats.voteTimestamps[v.stats.voteTimestamps.length - 1];
          return lastTs && (lastTs - session.stats.roundStartTime) < 10000;
        });
        if (allFast) {
          achievement = { id: 'speed-round', icon: '💨', title: 'Speed Round', description: 'Everyone voted within 10 seconds' };
        }
      }
    }

    if (!achievement) {
      // Priority 7: All Over the Map — 4+ unique Fibonacci values
      const uniqueVotes = new Set(votes.map(String));
      if (uniqueVotes.size >= 4) {
        achievement = { id: 'all-over-map', icon: '🗺️', title: 'All Over the Map', description: `${uniqueVotes.size} different values — time to discuss` };
      }
    }

    if (!achievement) {
      // Priority 8: Coffee Break — someone played ☕
      const afkPlayer = voters.find(v => v.vote === '☕');
      if (afkPlayer) {
        achievement = { id: 'coffee-break', icon: '☕', title: 'Coffee Break', description: `${afkPlayer.name} needs more caffeine`, playerId: afkPlayer.id };
      }
    }

    // Track achievement for the player
    if (achievement) {
      session.stats.achievements.push({
        roundNumber: session.currentRound,
        achievementId: achievement.id,
        playerId: achievement.playerId || null,
      });
      // Increment achievementCount for the relevant player
      if (achievement.playerId) {
        const p = session.players.get(achievement.playerId);
        if (p) p.stats.achievementCount++;
      }
    }

    return achievement;
  }

  revealCards(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };

    session.phase = 'revealed';
    session.lastActivityAt = Date.now();

    const achievement = this.computeAchievement(session);

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

    return { players, achievement };
  }

  newRound(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };

    session.currentRound += 1;
    this.resetVotes(session);

    this.checkStatsReset();
    this.stats.roundsPlayed++;

    return { currentRound: session.currentRound, isReVote: false };
  }

  reVote(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };

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

    console.log(`[disconnectPlayer] Marking ${player.name} (${playerId}) as disconnected`);
    player.isConnected = false;
    player.disconnectedAt = Date.now();

    const timerKey = `${sessionId}:${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey));
    }
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(timerKey);
      this.autoRemovePlayer(sessionId, playerId);
    }, DISCONNECT_GRACE_MS);
    this.disconnectTimers.set(timerKey, timer);

    // Check auto-reveal: disconnected player excluded from threshold
    const autoRevealResult = this.checkAutoReveal(session);
    if (autoRevealResult && this.onBroadcast) {
      this.onBroadcast(sessionId, 'cards-revealed', { players: autoRevealResult.players, achievement: autoRevealResult.achievement || null });
    }

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

  // Called automatically after disconnect grace period (5 min)
  autoRemovePlayer(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`[autoRemove] Session ${sessionId} not found — skipping`);
      return;
    }

    const player = session.players.get(playerId);
    if (!player) {
      console.log(`[autoRemove] Player ${playerId} not found in session ${sessionId} — skipping`);
      return;
    }
    if (player.isConnected) {
      console.log(`[autoRemove] Player ${player.name} (${playerId}) already reconnected — skipping`);
      return; // reconnected in time
    }

    session.players.delete(playerId);
    console.log(`Auto-removed player ${player.name} (${playerId}) from session ${sessionId} after disconnect timeout`);

    // Notify via broadcast callback
    if (this.onBroadcast) {
      this.onBroadcast(sessionId, 'player-left', { playerId });
    }
  }

  leaveSession(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };

    session.players.delete(playerId);

    if (session.players.size === 0) {
      this.sessions.delete(sessionId);
      return { playerId, sessionDestroyed: true };
    }

    return { playerId, sessionDestroyed: false };
  }

  kickPlayer(sessionId, requesterId, targetPlayerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.facilitatorId !== requesterId) return { error: 'Only the facilitator can kick players' };
    if (requesterId === targetPlayerId) return { error: 'Cannot kick yourself' };

    const target = session.players.get(targetPlayerId);
    if (!target) return { error: 'Player not found' };

    session.players.delete(targetPlayerId);

    const timerKey = `${sessionId}:${targetPlayerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey));
      this.disconnectTimers.delete(timerKey);
    }

    const autoRevealResult = this.checkAutoReveal(session);
    return { playerId: targetPlayerId, autoReveal: autoRevealResult };
  }

  computeSessionSummary(session) {
    const durationMs = Date.now() - session.createdAt;
    const durationMinutes = Math.round(durationMs / 60000);
    const allPlayers = Array.from(session.players.values());
    const voters = allPlayers.filter(p => p.role === 'player' || p.role === 'facilitator');

    const consensusRate = session.stats.totalRevealedRounds > 0
      ? Math.round((session.stats.consensusRounds / session.stats.totalRevealedRounds) * 100)
      : 0;

    // MVP: Most Achievements
    let mostAchievements = null;
    const maxAch = Math.max(...voters.map(p => p.stats.achievementCount), 0);
    if (maxAch > 0) {
      const p = voters.find(v => v.stats.achievementCount === maxAch);
      if (p) mostAchievements = { name: p.name, count: p.stats.achievementCount };
    }

    // MVP: Most Accurate (closest to average)
    let mostAccurate = null;
    const maxAccurate = Math.max(...voters.map(p => p.stats.closestToAverageCount), 0);
    if (maxAccurate > 0) {
      const p = voters.find(v => v.stats.closestToAverageCount === maxAccurate);
      if (p) mostAccurate = { name: p.name, count: p.stats.closestToAverageCount, total: session.stats.totalRevealedRounds };
    }

    // MVP: Most AFK
    let mostAfk = null;
    const maxAfk = Math.max(...voters.map(p => p.stats.afkCount), 0);
    if (maxAfk > 0) {
      const p = voters.find(v => v.stats.afkCount === maxAfk);
      if (p) mostAfk = { name: p.name, count: p.stats.afkCount };
    }

    // MVP: Fastest Voter (using firstToVoteCount as proxy)
    let fastestVoter = null;
    const maxFirstVote = Math.max(...voters.map(p => p.stats.firstToVoteCount), 0);
    if (maxFirstVote > 0) {
      const p = voters.find(v => v.stats.firstToVoteCount === maxFirstVote);
      if (p) fastestVoter = { name: p.name, count: p.stats.firstToVoteCount };
    }

    return {
      gameName: session.settings.gameName,
      totalRounds: session.currentRound,
      durationMinutes,
      playerCount: allPlayers.length,
      consensusRate,
      bestStreak: session.stats.bestStreak,
      mvps: {
        mostAchievements,
        mostAccurate,
        mostAfk,
        fastestVoter,
      },
    };
  }

  endSession(sessionId, requesterId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.facilitatorId !== requesterId) return { error: 'Only the facilitator can end the session' };

    const summary = this.computeSessionSummary(session);

    for (const [key, timer] of this.disconnectTimers) {
      if (key.startsWith(`${sessionId}:`)) {
        clearTimeout(timer);
        this.disconnectTimers.delete(key);
      }
    }

    this.sessions.delete(sessionId);
    return { sessionDestroyed: true, summary };
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
      facilitatorId: session.facilitatorId,
      isReVoting: session.isReVoting,
      countdownValue: null, // countdown is client-side only
      consensusStreak: session.stats.consensusStreak,
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

  // --- Helpers ---

  resetVotes(session) {
    session.phase = 'voting';
    session.isReVoting = false;
    session.lastActivityAt = Date.now();
    session.stats.firstVoterId = null;
    session.stats.roundStartTime = Date.now();
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

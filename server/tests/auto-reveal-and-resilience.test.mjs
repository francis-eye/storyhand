import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { SessionManager } from '../sessionManager.js';

// ── Test Server Setup ─────────────────────────────────────────────────────────

let httpServer;
let io;
let sessionManager;
let port;
const sockets = [];

function connect() {
  const s = ioClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  sockets.push(s);
  return s;
}

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function waitForEvent(socket, event, ms = 5000) {
  return withTimeout(
    new Promise((resolve) => socket.once(event, resolve)),
    ms
  );
}

function emitWithAck(socket, event, data, ms = 5000) {
  return withTimeout(
    new Promise((resolve) => socket.emit(event, data, resolve)),
    ms
  );
}

const DEFAULT_SETTINGS = {
  gameName: 'Test Game',
  votingSystem: 'fibonacci',
  showAverage: true,
  showCountdown: false,
  inactivityTimeout: 30,
  tableTheme: 'classic',
};

async function createSession(facilitatorSocket, hostName = 'Facilitator') {
  const result = await emitWithAck(facilitatorSocket, 'create-session', {
    settings: DEFAULT_SETTINGS,
    hostName,
  });
  return result.data;
}

async function joinSession(socket, sessionId, role, name) {
  const result = await emitWithAck(socket, 'join-session', {
    sessionId,
    role,
    name,
  });
  return result.data;
}

beforeAll(() => {
  return new Promise((resolve) => {
    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer, {
      pingTimeout: 60000,
      pingInterval: 25000,
      cors: { origin: '*' },
    });

    sessionManager = new SessionManager();
    sessionManager.onBroadcast = (sessionId, event, data) => {
      io.to(sessionId).emit(event, data);
    };

    // Register all event handlers (mirrors server/index.js)
    io.on('connection', (socket) => {
      socket.on('create-session', ({ settings, hostName }, callback) => {
        const result = sessionManager.createSession(settings, hostName);
        socket.data.sessionId = result.sessionId;
        socket.data.playerId = result.facilitatorId;
        sessionManager.setSocketId(result.sessionId, result.facilitatorId, socket.id);
        socket.join(result.sessionId);
        callback({ success: true, data: result });
      });

      socket.on('join-session', ({ sessionId, role, name }, callback) => {
        socket.join(sessionId);
        const result = sessionManager.joinSession(sessionId, role, name, socket.id);
        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }
        socket.data.sessionId = sessionId;
        socket.data.playerId = result.playerId;
        callback({ success: true, data: result });
        socket.to(sessionId).emit('player-joined', { player: result.player });
      });

      socket.on('reconnect-session', ({ sessionId, playerId }, callback) => {
        socket.join(sessionId);
        const session = sessionManager.getSession(sessionId);
        if (session) {
          const existingPlayer = session.players.get(playerId);
          if (existingPlayer && existingPlayer.socketId && existingPlayer.socketId !== socket.id) {
            const existingSocket = io.sockets.sockets.get(existingPlayer.socketId);
            if (existingSocket) {
              existingSocket.data = {};
              existingSocket.disconnect(true);
            }
          }
        }
        const result = sessionManager.reconnectPlayer(sessionId, playerId, socket.id);
        if (!result) {
          callback({ success: false, error: 'Session or player not found' });
          return;
        }
        socket.data.sessionId = sessionId;
        socket.data.playerId = playerId;
        const gameState = sessionManager.getGameState(sessionId);
        callback({ success: true, data: { gameState } });
        socket.to(sessionId).emit('player-reconnected', { playerId });
      });

      socket.on('play-card', ({ sessionId, playerId, value }) => {
        const result = sessionManager.playCard(sessionId, playerId, value);
        if (result.error) return;
        io.to(sessionId).emit('card-played', { playerId, hasVoted: result.hasVoted });
        if (result.autoReveal) {
          io.to(sessionId).emit('cards-revealed', { players: result.autoReveal.players });
        }
      });

      socket.on('reveal-cards', ({ sessionId }) => {
        const result = sessionManager.revealCards(sessionId);
        if (result.error) return;
        io.to(sessionId).emit('cards-revealed', { players: result.players });
      });

      socket.on('new-round', ({ sessionId }) => {
        const result = sessionManager.newRound(sessionId);
        if (result.error) return;
        io.to(sessionId).emit('round-reset', {
          currentRound: result.currentRound,
          isReVote: false,
        });
      });

      socket.on('re-vote', ({ sessionId }) => {
        const result = sessionManager.reVote(sessionId);
        if (result.error) return;
        io.to(sessionId).emit('round-reset', {
          currentRound: result.currentRound,
          isReVote: true,
        });
      });

      socket.on('kick-player', ({ sessionId, targetPlayerId }, callback) => {
        const requesterId = socket.data.playerId;
        const result = sessionManager.kickPlayer(sessionId, requesterId, targetPlayerId);
        if (result.error) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }
        io.to(sessionId).emit('player-left', { playerId: targetPlayerId });
        if (result.autoReveal) {
          io.to(sessionId).emit('cards-revealed', { players: result.autoReveal.players });
        }
        for (const [, s] of io.sockets.sockets) {
          if (s.data.playerId === targetPlayerId && s.data.sessionId === sessionId) {
            s.data = {};
            s.disconnect(true);
            break;
          }
        }
        if (typeof callback === 'function') callback({ success: true });
      });

      socket.on('end-session', ({ sessionId }, callback) => {
        const requesterId = socket.data.playerId;
        const result = sessionManager.endSession(sessionId, requesterId);
        if (result.error) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }
        io.to(sessionId).emit('session-expired', {});
        if (typeof callback === 'function') callback({ success: true });
      });

      socket.on('leave-session', ({ sessionId, playerId }, callback) => {
        const result = sessionManager.leaveSession(sessionId, playerId);
        if (result.error) {
          if (typeof callback === 'function') callback({ success: false });
          return;
        }
        socket.leave(sessionId);
        socket.data.sessionId = null;
        socket.data.playerId = null;
        if (result.sessionDestroyed) {
          io.to(sessionId).emit('session-expired', {});
        } else {
          io.to(sessionId).emit('player-left', { playerId });
        }
        if (typeof callback === 'function') callback({ success: true });
      });

      socket.on('disconnect', () => {
        const { sessionId, playerId } = socket.data;
        if (!sessionId || !playerId) return;
        const result = sessionManager.disconnectPlayer(sessionId, playerId);
        if (result) {
          io.to(sessionId).emit('player-disconnected', { playerId });
        }
      });
    });

    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });
});

afterEach(() => {
  // Disconnect all test sockets
  for (const s of sockets) {
    if (s.connected) s.disconnect();
  }
  sockets.length = 0;
});

afterAll(() => {
  return new Promise((resolve) => {
    io.close();
    httpServer.close(resolve);
  });
});

// ── Auto-Reveal Tests ─────────────────────────────────────────────────────────

describe('Auto-Reveal', () => {
  it('reveals automatically when all connected players have voted', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    const j2 = await joinSession(player2, session.sessionId, 'player', 'Bob');

    const revealPromise = waitForEvent(facilitator, 'cards-revealed');

    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 8 });
    player2.emit('play-card', { sessionId: session.sessionId, playerId: j2.playerId, value: 3 });

    const revealed = await revealPromise;
    expect(revealed.players).toHaveLength(3);
    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe(5);
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBe(8);
    expect(revealed.players.find(p => p.name === 'Bob').vote).toBe(3);
  });

  it('counts coffee and question mark as voted for auto-reveal', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    const revealPromise = waitForEvent(facilitator, 'cards-revealed');

    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: '☕' });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: '?' });

    const revealed = await revealPromise;
    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe('☕');
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBe('?');
  });

  it('excludes disconnected players from the auto-reveal threshold', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    const j2 = await joinSession(player2, session.sessionId, 'player', 'Bob');

    // Disconnect player2
    const discPromise = waitForEvent(facilitator, 'player-disconnected');
    player2.disconnect();
    await discPromise;

    // Remaining 2 vote — should auto-reveal without Bob
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 8 });

    const revealed = await revealPromise;
    expect(revealed.players).toHaveLength(3); // Bob still in roster
    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe(5);
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBe(8);
  });

  it('does not auto-reveal if only observers are connected', async () => {
    const facilitator = connect();
    const observer = connect();

    const session = await createSession(facilitator);
    await joinSession(observer, session.sessionId, 'observer');

    // Disconnect facilitator (only voter)
    const discPromise = waitForEvent(observer, 'player-disconnected');
    facilitator.disconnect();
    await discPromise;

    // Give the server a moment — auto-reveal should NOT fire
    const gotReveal = await Promise.race([
      waitForEvent(observer, 'cards-revealed').then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    expect(gotReveal).toBe(false);
  });

  it('triggers auto-reveal when a player disconnects and remaining voters are done', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Facilitator votes, Alice hasn't
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    // Wait for card-played event to ensure it's processed
    await waitForEvent(facilitator, 'card-played');

    // Alice disconnects — facilitator is only connected voter who has voted
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    player1.disconnect();
    const revealed = await revealPromise;
    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe(5);
  });
});

// ── Shared Game Controls ──────────────────────────────────────────────────────

describe('Shared Game Controls (any player can act)', () => {
  it('allows any player to start a new round', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Vote to get to revealed phase
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 3 });
    await revealPromise;

    // Non-facilitator starts new round
    const resetPromise = waitForEvent(facilitator, 'round-reset');
    player1.emit('new-round', { sessionId: session.sessionId });
    const reset = await resetPromise;

    expect(reset.currentRound).toBe(2);
    expect(reset.isReVote).toBe(false);
  });

  it('allows any player to trigger re-vote', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Vote to revealed
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 3 });
    await revealPromise;

    // Non-facilitator triggers re-vote
    const resetPromise = waitForEvent(facilitator, 'round-reset');
    player1.emit('re-vote', { sessionId: session.sessionId });
    const reset = await resetPromise;

    expect(reset.isReVote).toBe(true);
  });

  it('allows any player to trigger Reveal Now (early reveal)', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    await joinSession(player2, session.sessionId, 'player', 'Bob');

    // Only facilitator votes (partial)
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    await waitForEvent(player1, 'card-played');

    // Alice triggers manual reveal (Reveal Now)
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    player1.emit('reveal-cards', { sessionId: session.sessionId });

    const revealed = await revealPromise;
    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe(5);
    // Alice and Bob didn't vote
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBeNull();
    expect(revealed.players.find(p => p.name === 'Bob').vote).toBeNull();
  });
});

// ── Facilitator Role ──────────────────────────────────────────────────────────

describe('Facilitator Role', () => {
  it('creates session with facilitator role and star badge data', async () => {
    const facilitator = connect();
    const session = await createSession(facilitator, 'Francis');

    expect(session.facilitatorId).toBeDefined();
    expect(session.gameState.facilitatorId).toBe(session.facilitatorId);

    const facPlayer = session.gameState.players.find(p => p.id === session.facilitatorId);
    expect(facPlayer.role).toBe('facilitator');
    expect(facPlayer.name).toBe('Francis');
  });

  it('facilitator can vote like any other player', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    const revealPromise = waitForEvent(player1, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 13 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 8 });

    const revealed = await revealPromise;
    expect(revealed.players.find(p => p.role === 'facilitator').vote).toBe(13);
  });

  it('facilitator can kick a player', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    const leftPromise = waitForEvent(facilitator, 'player-left');
    const kickResult = await emitWithAck(facilitator, 'kick-player', {
      sessionId: session.sessionId,
      targetPlayerId: j1.playerId,
    });

    expect(kickResult.success).toBe(true);
    const left = await leftPromise;
    expect(left.playerId).toBe(j1.playerId);
  });

  it('non-facilitator cannot kick players', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    const result = await emitWithAck(player1, 'kick-player', {
      sessionId: session.sessionId,
      targetPlayerId: session.facilitatorId,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('facilitator');
  });

  it('facilitator can end the session', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    await joinSession(player1, session.sessionId, 'player', 'Alice');

    const expiredPromise = waitForEvent(player1, 'session-expired');
    const result = await emitWithAck(facilitator, 'end-session', {
      sessionId: session.sessionId,
    });

    expect(result.success).toBe(true);
    await expiredPromise; // Player received session-expired
  });

  it('non-facilitator cannot end the session', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    await joinSession(player1, session.sessionId, 'player', 'Alice');

    const result = await emitWithAck(player1, 'end-session', {
      sessionId: session.sessionId,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('facilitator');
  });

  it('kicking a player triggers auto-reveal if remaining voters are done', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    const j2 = await joinSession(player2, session.sessionId, 'player', 'Bob');

    // Facilitator and Alice vote, Bob doesn't
    // Collect both card-played events before proceeding
    const cardPlayedPromise = new Promise((resolve) => {
      let count = 0;
      facilitator.on('card-played', () => {
        count++;
        if (count >= 2) {
          facilitator.off('card-played');
          resolve();
        }
      });
    });
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 8 });
    await withTimeout(cardPlayedPromise);

    // Kick Bob — should trigger auto-reveal
    const revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('kick-player', { sessionId: session.sessionId, targetPlayerId: j2.playerId });
    const revealed = await revealPromise;

    expect(revealed.players.find(p => p.name === 'Facilitator').vote).toBe(5);
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBe(8);
  });
});

// ── Connection Resilience ─────────────────────────────────────────────────────

describe('Connection Resilience', () => {
  it('facilitator reconnects with role preserved (no promotion)', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Facilitator disconnects
    const discPromise = waitForEvent(player1, 'player-disconnected');
    facilitator.disconnect();
    await discPromise;

    // Reconnect with new socket
    const facilitator2 = connect();
    const reconnResult = await emitWithAck(facilitator2, 'reconnect-session', {
      sessionId: session.sessionId,
      playerId: session.facilitatorId,
    });

    expect(reconnResult.success).toBe(true);
    const gs = reconnResult.data.gameState;
    expect(gs.facilitatorId).toBe(session.facilitatorId);
    expect(gs.players.find(p => p.id === session.facilitatorId).role).toBe('facilitator');
    expect(gs.players.find(p => p.id === j1.playerId).role).toBe('player');
  });

  it('session continues normally when facilitator disconnects', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    const j2 = await joinSession(player2, session.sessionId, 'player', 'Bob');

    // Facilitator disconnects
    const discPromise = waitForEvent(player1, 'player-disconnected');
    facilitator.disconnect();
    await discPromise;

    // Players can still vote and auto-reveal fires
    const revealPromise = waitForEvent(player1, 'cards-revealed');
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 5 });
    player2.emit('play-card', { sessionId: session.sessionId, playerId: j2.playerId, value: 8 });

    const revealed = await revealPromise;
    expect(revealed.players.find(p => p.name === 'Alice').vote).toBe(5);
    expect(revealed.players.find(p => p.name === 'Bob').vote).toBe(8);
  });

  it('reconnect replays correct game state', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Advance to round 3
    for (let i = 0; i < 2; i++) {
      const revP = waitForEvent(facilitator, 'cards-revealed');
      facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
      player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 5 });
      await revP;

      const resetP = waitForEvent(facilitator, 'round-reset');
      facilitator.emit('new-round', { sessionId: session.sessionId });
      await resetP;
    }

    // Player1 disconnects
    player1.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Reconnect
    const player1b = connect();
    const reconnResult = await emitWithAck(player1b, 'reconnect-session', {
      sessionId: session.sessionId,
      playerId: j1.playerId,
    });

    expect(reconnResult.success).toBe(true);
    expect(reconnResult.data.gameState.currentRound).toBe(3);
    expect(reconnResult.data.gameState.phase).toBe('voting');
  });

  it('multi-tab dedup: newest socket wins', async () => {
    const facilitator = connect();

    const session = await createSession(facilitator);

    // Simulate two "tabs" reconnecting for the same player
    const tab1 = connect();
    const reconn1 = await emitWithAck(tab1, 'reconnect-session', {
      sessionId: session.sessionId,
      playerId: session.facilitatorId,
    });
    expect(reconn1.success).toBe(true);

    const tab2 = connect();
    const reconn2 = await emitWithAck(tab2, 'reconnect-session', {
      sessionId: session.sessionId,
      playerId: session.facilitatorId,
    });
    expect(reconn2.success).toBe(true);

    // tab1 should have been disconnected by the server
    await new Promise((r) => setTimeout(r, 200));
    expect(tab1.connected).toBe(false);
    expect(tab2.connected).toBe(true);
  });

  it('facilitator can kick disconnected players immediately', async () => {
    const facilitator = connect();
    const player1 = connect();

    const session = await createSession(facilitator);
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');

    // Player1 disconnects
    const discPromise = waitForEvent(facilitator, 'player-disconnected');
    player1.disconnect();
    await discPromise;

    // Facilitator kicks disconnected player immediately (no waiting for grace period)
    const leftPromise = waitForEvent(facilitator, 'player-left');
    const kickResult = await emitWithAck(facilitator, 'kick-player', {
      sessionId: session.sessionId,
      targetPlayerId: j1.playerId,
    });
    expect(kickResult.success).toBe(true);
    const left = await leftPromise;
    expect(left.playerId).toBe(j1.playerId);
  });

  it('session cleanup when no players remain after leave', async () => {
    const facilitator = connect();

    const session = await createSession(facilitator);

    const result = await emitWithAck(facilitator, 'leave-session', {
      sessionId: session.sessionId,
      playerId: session.facilitatorId,
    });
    expect(result.success).toBe(true);

    // Session should be destroyed — verify by trying to join
    const player1 = connect();
    const joinResult = await emitWithAck(player1, 'join-session', {
      sessionId: session.sessionId,
      role: 'player',
      name: 'Alice',
    });
    expect(joinResult.success).toBe(false);
    expect(joinResult.error).toContain('not found');
  });
});

// ── Full Workflow (End-to-End) ────────────────────────────────────────────────

describe('Full Voting Workflow', () => {
  it('complete session: create, join, vote, auto-reveal, new round, re-vote, leave', async () => {
    const facilitator = connect();
    const player1 = connect();
    const player2 = connect();

    // 1. Create session
    const session = await createSession(facilitator, 'Francis');
    expect(session.sessionId).toHaveLength(6);

    // 2. Join players
    const j1 = await joinSession(player1, session.sessionId, 'player', 'Alice');
    const j2 = await joinSession(player2, session.sessionId, 'player', 'Bob');
    expect(j1.gameState.players).toHaveLength(2); // Facilitator + Alice (before Bob joins)

    // 3. All vote → auto-reveal (Round 1)
    let revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 8 });
    player2.emit('play-card', { sessionId: session.sessionId, playerId: j2.playerId, value: 5 });
    let revealed = await revealPromise;
    expect(revealed.players).toHaveLength(3);

    // 4. Alice starts new round (any player can)
    let resetPromise = waitForEvent(facilitator, 'round-reset');
    player1.emit('new-round', { sessionId: session.sessionId });
    let reset = await resetPromise;
    expect(reset.currentRound).toBe(2);

    // 5. Vote again → auto-reveal (Round 2)
    revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 3 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 3 });
    player2.emit('play-card', { sessionId: session.sessionId, playerId: j2.playerId, value: 3 });
    revealed = await revealPromise;
    // Consensus!
    expect(revealed.players.every(p => p.vote === 3 || p.vote === null)).toBe(true);

    // 6. Bob triggers re-vote (any player can)
    resetPromise = waitForEvent(facilitator, 'round-reset');
    player2.emit('re-vote', { sessionId: session.sessionId });
    reset = await resetPromise;
    expect(reset.isReVote).toBe(true);

    // 7. All vote again
    revealPromise = waitForEvent(facilitator, 'cards-revealed');
    facilitator.emit('play-card', { sessionId: session.sessionId, playerId: session.facilitatorId, value: 5 });
    player1.emit('play-card', { sessionId: session.sessionId, playerId: j1.playerId, value: 5 });
    player2.emit('play-card', { sessionId: session.sessionId, playerId: j2.playerId, value: 5 });
    await revealPromise;

    // 8. Players leave
    await emitWithAck(player2, 'leave-session', {
      sessionId: session.sessionId,
      playerId: j2.playerId,
    });
    await emitWithAck(player1, 'leave-session', {
      sessionId: session.sessionId,
      playerId: j1.playerId,
    });
    // Facilitator ends session
    await emitWithAck(facilitator, 'end-session', {
      sessionId: session.sessionId,
    });
  });
});

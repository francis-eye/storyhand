import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import express from 'express';
import { SessionManager } from '../sessionManager.js';

const PORT = 3099; // Use a non-standard port to avoid conflicts
const defaultSettings = {
  gameName: 'Integration Test',
  votingSystem: 'fibonacci',
  showAverage: true,
  showCountdown: false,
  inactivityTimeout: 30,
};

let httpServer, ioServer, sessionManager;
const sockets = []; // Track sockets for cleanup

function createSocket() {
  const socket = io(`http://localhost:${PORT}`, {
    autoConnect: true,
    transports: ['websocket'],
  });
  sockets.push(socket);
  return socket;
}

// Wait for a specific event on a socket, with timeout
function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

beforeAll(async () => {
  const app = express();
  httpServer = createServer(app);
  sessionManager = new SessionManager();

  ioServer = new Server(httpServer, {
    cors: { origin: '*' },
  });

  sessionManager.onBroadcast = (sessionId, event, data) => {
    ioServer.to(sessionId).emit(event, data);
  };

  // Register all the same handlers as index.js
  ioServer.on('connection', (socket) => {
    socket.on('create-session', ({ settings, hostName }, callback) => {
      const result = sessionManager.createSession(settings, hostName);
      socket.data.sessionId = result.sessionId;
      socket.data.playerId = result.hostId;
      sessionManager.setSocketId(result.sessionId, result.hostId, socket.id);
      socket.join(result.sessionId);
      callback({ success: true, data: result });
    });

    socket.on('join-session', ({ sessionId, role, name }, callback) => {
      const result = sessionManager.joinSession(sessionId, role, name, socket.id);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      socket.data.sessionId = sessionId;
      socket.data.playerId = result.playerId;
      socket.join(sessionId);
      callback({ success: true, data: result });
      socket.to(sessionId).emit('player-joined', { player: result.player });
    });

    socket.on('reconnect-session', ({ sessionId, playerId }, callback) => {
      const result = sessionManager.reconnectPlayer(sessionId, playerId, socket.id);
      if (!result) {
        callback({ success: false, error: 'Session or player not found' });
        return;
      }
      socket.data.sessionId = sessionId;
      socket.data.playerId = playerId;
      socket.join(sessionId);
      const gameState = sessionManager.getGameState(sessionId);
      callback({ success: true, data: { gameState } });
      socket.to(sessionId).emit('player-reconnected', { playerId });
    });

    socket.on('play-card', ({ sessionId, playerId, value }) => {
      const result = sessionManager.playCard(sessionId, playerId, value);
      if (result.error) return;
      ioServer.to(sessionId).emit('card-played', { playerId, hasVoted: true });
    });

    socket.on('reveal-cards', ({ sessionId }) => {
      const result = sessionManager.revealCards(sessionId, socket.data.playerId);
      if (result.error) return;
      ioServer.to(sessionId).emit('cards-revealed', { players: result.players });
    });

    socket.on('new-round', ({ sessionId }) => {
      const result = sessionManager.newRound(sessionId, socket.data.playerId);
      if (result.error) return;
      ioServer.to(sessionId).emit('round-reset', { currentRound: result.currentRound, isReVote: false });
    });

    socket.on('re-vote', ({ sessionId }) => {
      const result = sessionManager.reVote(sessionId, socket.data.playerId);
      if (result.error) return;
      ioServer.to(sessionId).emit('round-reset', { currentRound: result.currentRound, isReVote: true });
    });

    socket.on('transfer-host', ({ sessionId, newHostId }) => {
      const result = sessionManager.transferHost(sessionId, socket.data.playerId, newHostId);
      if (result.error) return;
      ioServer.to(sessionId).emit('host-transferred', { oldHostId: result.oldHostId, newHostId: result.newHostId });
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
        ioServer.to(sessionId).emit('session-expired', {});
      } else {
        ioServer.to(sessionId).emit('player-left', { playerId });
        if (result.newHostId) {
          ioServer.to(sessionId).emit('host-transferred', { oldHostId: playerId, newHostId: result.newHostId });
        }
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('disconnect', () => {
      const { sessionId, playerId } = socket.data;
      if (!sessionId || !playerId) return;
      const result = sessionManager.disconnectPlayer(sessionId, playerId);
      if (result) {
        ioServer.to(sessionId).emit('player-disconnected', { playerId });
        if (result.promoted) {
          ioServer.to(sessionId).emit('host-transferred', { oldHostId: playerId, newHostId: result.promoted.newHostId });
        }
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
});

afterEach(() => {
  // Disconnect all test sockets
  while (sockets.length) {
    const s = sockets.pop();
    if (s.connected) s.disconnect();
  }
});

afterAll(async () => {
  clearInterval(sessionManager.inactivityInterval);
  for (const timer of sessionManager.disconnectTimers.values()) {
    clearTimeout(timer);
  }
  ioServer.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe('Socket.IO Integration Tests', () => {
  it('create + join flow', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    expect(createResult.success).toBe(true);
    const sessionId = createResult.data.sessionId;

    const joinPromise = waitForEvent(hostSocket, 'player-joined');
    const joinResult = await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );
    expect(joinResult.success).toBe(true);
    expect(joinResult.data.gameState.players).toHaveLength(2);

    const joined = await joinPromise;
    expect(joined.player.name).toBe('Bob');
  });

  it('voting flow — play card, reveal, see votes', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    const joinResult = await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );
    const playerId = joinResult.data.playerId;

    // Both vote
    playerSocket.emit('play-card', { sessionId, playerId, value: 8 });
    await waitForEvent(hostSocket, 'card-played');

    hostSocket.emit('play-card', { sessionId, playerId: hostId, value: 5 });
    await waitForEvent(playerSocket, 'card-played');

    // Host reveals
    const revealPromise = waitForEvent(playerSocket, 'cards-revealed');
    hostSocket.emit('reveal-cards', { sessionId });
    const revealed = await revealPromise;

    const bob = revealed.players.find((p) => p.id === playerId);
    const alice = revealed.players.find((p) => p.id === hostId);
    expect(bob.vote).toBe(8);
    expect(alice.vote).toBe(5);
  });

  it('host disconnect triggers auto-promote', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const sessionId = createResult.data.sessionId;

    await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );

    const transferPromise = waitForEvent(playerSocket, 'host-transferred');
    hostSocket.disconnect();

    const transfer = await transferPromise;
    expect(transfer.newHostId).toBeTruthy();
    expect(transfer.oldHostId).toBe(createResult.data.hostId);
  });

  it('host leave-session with ack promotes player', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );

    const transferPromise = waitForEvent(playerSocket, 'host-transferred');
    const ack = await new Promise((r) =>
      hostSocket.emit('leave-session', { sessionId, playerId: hostId }, r)
    );
    expect(ack.success).toBe(true);

    const transfer = await transferPromise;
    expect(transfer.newHostId).toBeTruthy();
  });

  it('reconnect after disconnect restores state', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const sessionId = createResult.data.sessionId;

    const joinResult = await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );
    const playerId = joinResult.data.playerId;

    // Disconnect player
    playerSocket.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // Reconnect with new socket
    const reconnectSocket = createSocket();
    const reconnectResult = await new Promise((r) =>
      reconnectSocket.emit('reconnect-session', { sessionId, playerId }, r)
    );

    expect(reconnectResult.success).toBe(true);
    expect(reconnectResult.data.gameState.players).toHaveLength(2);
    const bob = reconnectResult.data.gameState.players.find((p) => p.id === playerId);
    expect(bob.isConnected).toBe(true);
  });

  it('host can vote', async () => {
    const hostSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'VotingHost' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    const cardPromise = waitForEvent(hostSocket, 'card-played');
    hostSocket.emit('play-card', { sessionId, playerId: hostId, value: 13 });

    const card = await cardPromise;
    expect(card.playerId).toBe(hostId);
    expect(card.hasVoted).toBe(true);
  });

  it('transfer host swaps roles for all clients', async () => {
    const hostSocket = createSocket();
    const playerSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    const joinResult = await new Promise((r) =>
      playerSocket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );
    const playerId = joinResult.data.playerId;

    // Both should receive host-transferred
    const hostTransferPromise = waitForEvent(hostSocket, 'host-transferred');
    const playerTransferPromise = waitForEvent(playerSocket, 'host-transferred');

    hostSocket.emit('transfer-host', { sessionId, newHostId: playerId });

    const [hostEvent, playerEvent] = await Promise.all([hostTransferPromise, playerTransferPromise]);
    expect(hostEvent.oldHostId).toBe(hostId);
    expect(hostEvent.newHostId).toBe(playerId);
    expect(playerEvent.newHostId).toBe(playerId);
  });

  it('session destroyed when no players to promote', async () => {
    const hostSocket = createSocket();

    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'LonelyHost' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    const ack = await new Promise((r) =>
      hostSocket.emit('leave-session', { sessionId, playerId: hostId }, r)
    );
    expect(ack.success).toBe(true);
    expect(sessionManager.getGameState(sessionId)).toBeNull();
  });
});

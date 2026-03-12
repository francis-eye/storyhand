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

  it('all participants see roster, vote status, and tally updates in real time', async () => {
    const hostSocket = createSocket();
    const player1Socket = createSocket();
    const player2Socket = createSocket();
    const observerSocket = createSocket();

    // Host creates session
    const createResult = await new Promise((r) =>
      hostSocket.emit('create-session', { settings: defaultSettings, hostName: 'Alice' }, r)
    );
    const { sessionId, hostId } = createResult.data;

    // 1) All participants join and everyone sees the full roster

    // Player 1 joins — host receives player-joined
    const hostSeesP1 = waitForEvent(hostSocket, 'player-joined');
    const join1 = await new Promise((r) =>
      player1Socket.emit('join-session', { sessionId, role: 'player', name: 'Bob' }, r)
    );
    expect(join1.success).toBe(true);
    const player1Id = join1.data.playerId;
    // Joiner sees full roster in callback
    expect(join1.data.gameState.players).toHaveLength(2);
    // Host sees the new player via broadcast
    const p1Joined = await hostSeesP1;
    expect(p1Joined.player.name).toBe('Bob');

    // Player 2 joins — both host and player 1 receive player-joined
    const hostSeesP2 = waitForEvent(hostSocket, 'player-joined');
    const p1SeesP2 = waitForEvent(player1Socket, 'player-joined');
    const join2 = await new Promise((r) =>
      player2Socket.emit('join-session', { sessionId, role: 'player', name: 'Carol' }, r)
    );
    expect(join2.success).toBe(true);
    const player2Id = join2.data.playerId;
    expect(join2.data.gameState.players).toHaveLength(3);
    const [hostGotP2, p1GotP2] = await Promise.all([hostSeesP2, p1SeesP2]);
    expect(hostGotP2.player.name).toBe('Carol');
    expect(p1GotP2.player.name).toBe('Carol');

    // Observer joins — host, player 1, and player 2 all receive player-joined
    const hostSeesObs = waitForEvent(hostSocket, 'player-joined');
    const p1SeesObs = waitForEvent(player1Socket, 'player-joined');
    const p2SeesObs = waitForEvent(player2Socket, 'player-joined');
    const joinObs = await new Promise((r) =>
      observerSocket.emit('join-session', { sessionId, role: 'observer', name: undefined }, r)
    );
    expect(joinObs.success).toBe(true);
    expect(joinObs.data.gameState.players).toHaveLength(4);
    const [hostGotObs, p1GotObs, p2GotObs] = await Promise.all([hostSeesObs, p1SeesObs, p2SeesObs]);
    expect(hostGotObs.player.role).toBe('observer');
    expect(p1GotObs.player.role).toBe('observer');
    expect(p2GotObs.player.role).toBe('observer');

    // 2) Vote status updates — card-played broadcasts to ALL participants

    // Player 1 plays a card — host, player 2, and observer all see it
    const hostSeesCard1 = waitForEvent(hostSocket, 'card-played');
    const p1SeesCard1 = waitForEvent(player1Socket, 'card-played');
    const p2SeesCard1 = waitForEvent(player2Socket, 'card-played');
    const obsSeesCard1 = waitForEvent(observerSocket, 'card-played');
    player1Socket.emit('play-card', { sessionId, playerId: player1Id, value: 5 });

    const [hostCard1, p1Card1, p2Card1, obsCard1] = await Promise.all([
      hostSeesCard1, p1SeesCard1, p2SeesCard1, obsSeesCard1,
    ]);
    // All receive the same event with playerId and hasVoted (no vote value — secret)
    expect(hostCard1).toEqual({ playerId: player1Id, hasVoted: true });
    expect(p1Card1).toEqual({ playerId: player1Id, hasVoted: true });
    expect(p2Card1).toEqual({ playerId: player1Id, hasVoted: true });
    expect(obsCard1).toEqual({ playerId: player1Id, hasVoted: true });

    // At this point: 1 of 3 voters voted (host + 2 players are voters, observer is not)
    // Verify server state reflects partial voting
    const midState = sessionManager.getGameState(sessionId);
    const voters = midState.players.filter((p) => p.role === 'host' || p.role === 'player');
    expect(voters).toHaveLength(3);
    expect(voters.filter((p) => p.hasVoted)).toHaveLength(1);

    // Player 2 plays a card — all 4 participants see the update (tally: 2 of 3)
    const hostSeesCard2 = waitForEvent(hostSocket, 'card-played');
    const p1SeesCard2 = waitForEvent(player1Socket, 'card-played');
    const p2SeesCard2 = waitForEvent(player2Socket, 'card-played');
    const obsSeesCard2 = waitForEvent(observerSocket, 'card-played');
    player2Socket.emit('play-card', { sessionId, playerId: player2Id, value: 8 });

    const [hostCard2, p1Card2, p2Card2, obsCard2] = await Promise.all([
      hostSeesCard2, p1SeesCard2, p2SeesCard2, obsSeesCard2,
    ]);
    expect(hostCard2).toEqual({ playerId: player2Id, hasVoted: true });
    expect(p1Card2).toEqual({ playerId: player2Id, hasVoted: true });
    expect(p2Card2).toEqual({ playerId: player2Id, hasVoted: true });
    expect(obsCard2).toEqual({ playerId: player2Id, hasVoted: true });

    // Host plays a card — all 4 participants see the update (tally: 3 of 3)
    const hostSeesCard3 = waitForEvent(hostSocket, 'card-played');
    const p1SeesCard3 = waitForEvent(player1Socket, 'card-played');
    const p2SeesCard3 = waitForEvent(player2Socket, 'card-played');
    const obsSeesCard3 = waitForEvent(observerSocket, 'card-played');
    hostSocket.emit('play-card', { sessionId, playerId: hostId, value: 13 });

    const [hostCard3, p1Card3, p2Card3, obsCard3] = await Promise.all([
      hostSeesCard3, p1SeesCard3, p2SeesCard3, obsSeesCard3,
    ]);
    expect(hostCard3).toEqual({ playerId: hostId, hasVoted: true });
    expect(p1Card3).toEqual({ playerId: hostId, hasVoted: true });
    expect(p2Card3).toEqual({ playerId: hostId, hasVoted: true });
    expect(obsCard3).toEqual({ playerId: hostId, hasVoted: true });

    // 3) Verify final server state — all voters have voted, votes are hidden
    const finalState = sessionManager.getGameState(sessionId);
    const finalVoters = finalState.players.filter((p) => p.role === 'host' || p.role === 'player');
    expect(finalVoters).toHaveLength(3);
    expect(finalVoters.every((p) => p.hasVoted)).toBe(true);
    // Votes are hidden (null) during voting phase
    expect(finalVoters.every((p) => p.vote === null)).toBe(true);
    expect(finalState.phase).toBe('voting');

    // Observer should NOT be counted as a voter
    const obs = finalState.players.find((p) => p.role === 'observer');
    expect(obs.hasVoted).toBe(false);
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

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { SessionManager } from './sessionManager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173'],
  },
});

const sessionManager = new SessionManager();
const PORT = process.env.PORT || 3001;

// Wire up broadcast callback for server-initiated events
// (auto-removal after disconnect timeout, inactivity expiry)
sessionManager.onBroadcast = (sessionId, event, data) => {
  io.to(sessionId).emit(event, data);
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessionManager.sessions.size });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // --- Create a new session ---
  socket.on('create-session', ({ settings, hostName }, callback) => {
    const result = sessionManager.createSession(settings, hostName);

    // Store session/player info on the socket for disconnect handling
    socket.data.sessionId = result.sessionId;
    socket.data.playerId = result.hostId;

    // Set the socket ID on the player
    sessionManager.setSocketId(result.sessionId, result.hostId, socket.id);

    // Join the Socket.IO room for this session
    socket.join(result.sessionId);

    console.log(`Session ${result.sessionId} created by ${hostName} (host: ${result.hostId})`);

    callback({ success: true, data: result });
  });

  // --- Join an existing session ---
  socket.on('join-session', ({ sessionId, role, name }, callback) => {
    const result = sessionManager.joinSession(sessionId, role, name, socket.id);

    if (result.error) {
      callback({ success: false, error: result.error });
      return;
    }

    // Store session/player info on the socket
    socket.data.sessionId = sessionId;
    socket.data.playerId = result.playerId;

    // Join the Socket.IO room
    socket.join(sessionId);

    console.log(`${name || 'Observer'} (${role}) joined session ${sessionId}`);

    // Send full state back to the joiner
    callback({ success: true, data: result });

    // Broadcast to everyone else in the session
    socket.to(sessionId).emit('player-joined', { player: result.player });

    // If phase changed from waiting → voting, broadcast updated state
    const gameState = sessionManager.getGameState(sessionId);
    if (gameState && gameState.phase === 'voting') {
      socket.to(sessionId).emit('phase-changed', { phase: 'voting' });
    }
  });

  // --- Reconnect to an existing session ---
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

    // Let others know this player is back
    socket.to(sessionId).emit('player-reconnected', { playerId });
    console.log(`Player ${playerId} reconnected to session ${sessionId}`);
  });

  // --- Play a card ---
  socket.on('play-card', ({ sessionId, playerId, value }) => {
    const result = sessionManager.playCard(sessionId, playerId, value);

    if (result.error) {
      console.error(`play-card error: ${result.error}`);
      return;
    }

    // Broadcast to ALL clients in the room (including sender for consistency)
    io.to(sessionId).emit('card-played', { playerId, hasVoted: true });
  });

  // --- Reveal cards (host only) ---
  socket.on('reveal-cards', ({ sessionId }) => {
    const playerId = socket.data.playerId;
    const result = sessionManager.revealCards(sessionId, playerId);

    if (result.error) {
      console.error(`reveal-cards error: ${result.error}`);
      return;
    }

    // Broadcast with full vote data to all clients
    io.to(sessionId).emit('cards-revealed', { players: result.players });
  });

  // --- New round (host only) ---
  socket.on('new-round', ({ sessionId }) => {
    const playerId = socket.data.playerId;
    const result = sessionManager.newRound(sessionId, playerId);

    if (result.error) {
      console.error(`new-round error: ${result.error}`);
      return;
    }

    io.to(sessionId).emit('round-reset', {
      currentRound: result.currentRound,
      isReVote: false,
    });
  });

  // --- Re-vote (host only) ---
  socket.on('re-vote', ({ sessionId }) => {
    const playerId = socket.data.playerId;
    const result = sessionManager.reVote(sessionId, playerId);

    if (result.error) {
      console.error(`re-vote error: ${result.error}`);
      return;
    }

    io.to(sessionId).emit('round-reset', {
      currentRound: result.currentRound,
      isReVote: true,
    });
  });

  // --- Leave session ---
  socket.on('leave-session', ({ sessionId, playerId }) => {
    const result = sessionManager.leaveSession(sessionId, playerId);

    if (result.error) {
      console.error(`leave-session error: ${result.error}`);
      return;
    }

    socket.leave(sessionId);
    socket.data.sessionId = null;
    socket.data.playerId = null;

    if (result.sessionDestroyed) {
      // Host left — tell everyone the session is over
      io.to(sessionId).emit('session-expired', {});
      console.log(`Session ${sessionId} destroyed (host left)`);
    } else {
      io.to(sessionId).emit('player-left', { playerId });
      console.log(`Player ${playerId} left session ${sessionId}`);
    }
  });

  // --- Disconnect (browser closed, network lost, etc.) ---
  socket.on('disconnect', () => {
    const { sessionId, playerId } = socket.data;
    console.log(`Socket disconnected: ${socket.id}`);

    if (!sessionId || !playerId) return;

    const result = sessionManager.disconnectPlayer(sessionId, playerId);
    if (result) {
      io.to(sessionId).emit('player-disconnected', { playerId });
      console.log(`Player ${playerId} disconnected from session ${sessionId}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Storyhand server running on http://localhost:${PORT}`);
});

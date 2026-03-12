import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SessionManager } from './sessionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(httpServer, {
  // In production, client and server are same-origin (Express serves the React build),
  // so CORS is not needed. In dev, whitelist the Vite dev server.
  cors: isProduction ? false : { origin: ['http://localhost:5173'] },
});

const sessionManager = new SessionManager();
const PORT = process.env.PORT || 3001;

// In production, serve the built client files
// Note: SPA catch-all is registered AFTER API routes (below) so it doesn't intercept them
let clientDist;
if (isProduction) {
  clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
}

// Wire up broadcast callback for server-initiated events
// (auto-removal after disconnect timeout, inactivity expiry)
sessionManager.onBroadcast = (sessionId, event, data) => {
  io.to(sessionId).emit(event, data);
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessionManager.sessions.size });
});

// Daily stats endpoint
app.get('/api/stats', (req, res) => {
  res.json(sessionManager.getStats());
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
    // ALWAYS join the room first, unconditionally, before ANY other logic.
    // This ensures the socket receives broadcasts even if joinSession finds
    // the player already exists (e.g., polling→websocket transport upgrade).
    socket.join(sessionId);

    const result = sessionManager.joinSession(sessionId, role, name, socket.id);

    if (result.error) {
      callback({ success: false, error: result.error });
      return;
    }

    // Store session/player info on the socket
    socket.data.sessionId = sessionId;
    socket.data.playerId = result.playerId;

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
    // ALWAYS join the room first, unconditionally, before ANY other logic.
    socket.join(sessionId);

    const result = sessionManager.reconnectPlayer(sessionId, playerId, socket.id);

    if (!result) {
      callback({ success: false, error: 'Session or player not found' });
      return;
    }

    socket.data.sessionId = sessionId;
    socket.data.playerId = playerId;

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
    io.to(sessionId).emit('card-played', { playerId, hasVoted: result.hasVoted });
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

  // --- Transfer host ---
  socket.on('transfer-host', ({ sessionId, newHostId }) => {
    const playerId = socket.data.playerId;
    const result = sessionManager.transferHost(sessionId, playerId, newHostId);

    if (result.error) {
      console.error(`transfer-host error: ${result.error}`);
      return;
    }

    io.to(sessionId).emit('host-transferred', {
      oldHostId: result.oldHostId,
      newHostId: result.newHostId,
    });
    console.log(`Host transferred from ${result.oldHostId} to ${result.newHostId} in session ${sessionId}`);
  });

  // --- Leave session ---
  socket.on('leave-session', ({ sessionId, playerId }, callback) => {
    const result = sessionManager.leaveSession(sessionId, playerId);

    if (result.error) {
      console.error(`leave-session error: ${result.error}`);
      if (typeof callback === 'function') callback({ success: false });
      return;
    }

    socket.leave(sessionId);
    socket.data.sessionId = null;
    socket.data.playerId = null;

    if (result.sessionDestroyed) {
      // No one to promote — tell everyone the session is over
      io.to(sessionId).emit('session-expired', {});
      console.log(`Session ${sessionId} destroyed (host left, no players to promote)`);
    } else {
      io.to(sessionId).emit('player-left', { playerId });
      // If host left but another player was promoted, broadcast the transfer
      if (result.newHostId) {
        io.to(sessionId).emit('host-transferred', {
          oldHostId: playerId,
          newHostId: result.newHostId,
        });
        console.log(`Host left session ${sessionId}, promoted ${result.newHostId} to host`);
      } else {
        console.log(`Player ${playerId} left session ${sessionId}`);
      }
    }

    // Acknowledge so client can safely disconnect after server processes the leave
    if (typeof callback === 'function') callback({ success: true });
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
      // Host promotion is now delayed (5s) and broadcast via onBroadcast callback
    }
  });
});

// SPA catch-all — registered last so API routes (/health, /api/*) take priority
if (isProduction && clientDist) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Storyhand server running on http://localhost:${PORT}`);
});

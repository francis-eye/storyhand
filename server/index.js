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
  pingTimeout: 60000,
  pingInterval: 25000,
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
    const sanitizedName = (hostName || '').slice(0, 20);
    const result = sessionManager.createSession(settings, sanitizedName);

    // Store session/player info on the socket for disconnect handling
    socket.data.sessionId = result.sessionId;
    socket.data.playerId = result.facilitatorId;

    // Set the socket ID on the player
    sessionManager.setSocketId(result.sessionId, result.facilitatorId, socket.id);

    // Join the Socket.IO room for this session
    socket.join(result.sessionId);

    console.log(`Session ${result.sessionId} created by ${hostName} (facilitator: ${result.facilitatorId})`);

    callback({ success: true, data: result });
  });

  // --- Join an existing session ---
  socket.on('join-session', ({ sessionId, role, name }, callback) => {
    // ALWAYS join the room first, unconditionally, before ANY other logic.
    // This ensures the socket receives broadcasts even if joinSession finds
    // the player already exists (e.g., polling→websocket transport upgrade).
    socket.join(sessionId);

    const sanitizedName = name ? name.slice(0, 20) : name;
    const result = sessionManager.joinSession(sessionId, role, sanitizedName, socket.id);

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
    console.log(`[reconnect] Socket ${socket.id} attempting reconnect | sessionId: ${sessionId} | playerId: ${playerId}`);

    // ALWAYS join the room first, unconditionally, before ANY other logic.
    socket.join(sessionId);

    // Multi-tab deduplication: disconnect old socket for this player
    const session = sessionManager.getSession(sessionId);
    if (session) {
      const existingPlayer = session.players.get(playerId);
      if (existingPlayer && existingPlayer.socketId && existingPlayer.socketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingPlayer.socketId);
        if (existingSocket) {
          existingSocket.data = {};
          existingSocket.disconnect(true);
          console.log(`[reconnect] Disconnected old socket ${existingPlayer.socketId} for player ${playerId} (multi-tab dedup)`);
        }
      }
    }

    const result = sessionManager.reconnectPlayer(sessionId, playerId, socket.id);
    console.log(`[reconnect] reconnectPlayer result:`, result);

    if (!result) {
      console.log(`[reconnect] Failed — session or player not found`);
      callback({ success: false, error: 'Session or player not found' });
      return;
    }

    socket.data.sessionId = sessionId;
    socket.data.playerId = playerId;

    const gameState = sessionManager.getGameState(sessionId);
    console.log(`[reconnect] Success. Players in session:`, gameState?.players.map((p) => ({ name: p.name, id: p.id, isConnected: p.isConnected })));
    callback({ success: true, data: { gameState } });

    // Let others know this player is back
    socket.to(sessionId).emit('player-reconnected', { playerId });
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

    if (result.autoReveal) {
      io.to(sessionId).emit('cards-revealed', { players: result.autoReveal.players, achievement: result.autoReveal.achievement || null });
    }
  });

  // --- Reveal cards ---
  socket.on('reveal-cards', ({ sessionId }) => {
    const result = sessionManager.revealCards(sessionId);

    if (result.error) {
      console.error(`reveal-cards error: ${result.error}`);
      return;
    }

    io.to(sessionId).emit('cards-revealed', { players: result.players, achievement: result.achievement || null });
  });

  // --- New round ---
  socket.on('new-round', ({ sessionId }) => {
    const result = sessionManager.newRound(sessionId);

    if (result.error) {
      console.error(`new-round error: ${result.error}`);
      return;
    }

    io.to(sessionId).emit('round-reset', {
      currentRound: result.currentRound,
      isReVote: false,
    });
  });

  // --- Re-vote ---
  socket.on('re-vote', ({ sessionId }) => {
    const result = sessionManager.reVote(sessionId);

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
      io.to(sessionId).emit('session-expired', {});
      console.log(`Session ${sessionId} destroyed (no players remaining)`);
    } else {
      io.to(sessionId).emit('player-left', { playerId });
      console.log(`Player ${playerId} left session ${sessionId}`);
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // --- Kick player (facilitator only) ---
  socket.on('kick-player', ({ sessionId, targetPlayerId }, callback) => {
    const requesterId = socket.data.playerId;
    const result = sessionManager.kickPlayer(sessionId, requesterId, targetPlayerId);

    if (result.error) {
      console.error(`kick-player error: ${result.error}`);
      if (typeof callback === 'function') callback({ success: false, error: result.error });
      return;
    }

    io.to(sessionId).emit('player-left', { playerId: targetPlayerId });
    console.log(`Facilitator kicked player ${targetPlayerId} from session ${sessionId}`);

    if (result.autoReveal) {
      io.to(sessionId).emit('cards-revealed', { players: result.autoReveal.players, achievement: result.autoReveal.achievement || null });
    }

    // Force-disconnect the kicked player's socket
    for (const [, s] of io.sockets.sockets) {
      if (s.data.playerId === targetPlayerId && s.data.sessionId === sessionId) {
        s.data = {};
        s.disconnect(true);
        break;
      }
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // --- End session (facilitator only) ---
  socket.on('end-session', ({ sessionId }, callback) => {
    const requesterId = socket.data.playerId;
    const result = sessionManager.endSession(sessionId, requesterId);

    if (result.error) {
      console.error(`end-session error: ${result.error}`);
      if (typeof callback === 'function') callback({ success: false, error: result.error });
      return;
    }

    io.to(sessionId).emit('session-expired', { summary: result.summary });
    console.log(`Facilitator ended session ${sessionId}`);

    if (typeof callback === 'function') callback({ success: true, summary: result.summary });
  });

  // --- Submit feedback (fire-and-forget, no callback) ---
  socket.on('submit-feedback', (data) => {
    // Rate limit: max 3 feedback submissions per socket connection
    socket.data.feedbackCount = (socket.data.feedbackCount || 0) + 1;
    if (socket.data.feedbackCount > 3) {
      console.warn(`[submit-feedback] Rate limited socket ${socket.id}`);
      return;
    }

    const sentiment = Number(data && data.sentiment);
    if (!sentiment || sentiment < 1 || sentiment > 5) return;

    const sanitizedComment = (data.comment || '').slice(0, 500).replace(/\n/g, ' ');
    const context = data.context || {};

    const entry = {
      type: 'FEEDBACK',
      timestamp: new Date().toISOString(),
      sentiment,
      comment: sanitizedComment || null,
      sessionId: context.sessionId || null,
      theme: context.tableTheme || null,
      playerCount: context.playerCount || null,
      roundsPlayed: context.roundsPlayed || null,
      role: context.role || null,
    };

    console.log(JSON.stringify(entry));

    // Optional webhook forwarding (Discord, Slack, etc.)
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhookUrl) {
      const sentimentEmoji = ['', '\u{1F624}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '\u{1F60D}'][sentiment];
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            `**${sentimentEmoji} New Feedback** (${sentiment}/5)`,
            sanitizedComment ? `> ${sanitizedComment}` : null,
            `Session: ${context.sessionId || 'landing page'} | Theme: ${context.tableTheme || 'n/a'} | Players: ${context.playerCount || 'n/a'} | Rounds: ${context.roundsPlayed || 'n/a'}`,
          ].filter(Boolean).join('\n'),
        }),
      }).catch((err) => {
        console.error('[submit-feedback] Webhook error:', err.message);
      });
    }
  });

  // --- Disconnect (browser closed, network lost, etc.) ---
  socket.on('disconnect', (reason) => {
    const { sessionId, playerId } = socket.data;
    console.log(`[disconnect] Socket ${socket.id} reason: ${reason} | sessionId: ${sessionId} | playerId: ${playerId}`);

    if (!sessionId || !playerId) {
      console.log(`[disconnect] No session/player data on socket — skipping`);
      return;
    }

    const result = sessionManager.disconnectPlayer(sessionId, playerId);
    console.log(`[disconnect] disconnectPlayer result:`, result);
    if (result) {
      io.to(sessionId).emit('player-disconnected', { playerId });
      console.log(`[disconnect] Player ${playerId} disconnected from session ${sessionId}`);
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

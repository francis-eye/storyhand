import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionManager } from '../sessionManager.js';

const defaultSettings = {
  gameName: 'Test Game',
  votingSystem: 'fibonacci',
  showAverage: true,
  showCountdown: false,
  inactivityTimeout: 30,
};

describe('SessionManager', () => {
  let sm;

  beforeEach(() => {
    vi.useFakeTimers();
    sm = new SessionManager();
  });

  afterEach(() => {
    clearInterval(sm.inactivityInterval);
    // Clear all disconnect timers
    for (const timer of sm.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    vi.useRealTimers();
  });

  // --- Session lifecycle ---

  describe('createSession', () => {
    it('creates a session with correct structure', () => {
      const result = sm.createSession(defaultSettings, 'Alice');

      expect(result.sessionId).toMatch(/^[0-9A-F]{6}$/);
      expect(result.facilitatorId).toBeTruthy();
      expect(result.gameState).toBeTruthy();
      expect(result.gameState.settings.gameName).toBe('Test Game');
      expect(result.gameState.phase).toBe('voting');
      expect(result.gameState.currentRound).toBe(1);
      expect(result.gameState.players).toHaveLength(1);
      expect(result.gameState.players[0].role).toBe('facilitator');
      expect(result.gameState.players[0].name).toBe('Alice');
    });

    it('generates unique session IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 20; i++) {
        const result = sm.createSession(defaultSettings, 'Host');
        ids.add(result.sessionId);
      }
      expect(ids.size).toBe(20);
    });

    it('increments stats', () => {
      sm.createSession(defaultSettings, 'Host');
      sm.createSession(defaultSettings, 'Host2');
      const stats = sm.getStats();
      expect(stats.sessionsCreated).toBe(2);
    });
  });

  describe('joinSession', () => {
    it('adds a player to an existing session', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const result = sm.joinSession(sessionId, 'player', 'Bob', 'socket-1');

      expect(result.playerId).toBeTruthy();
      expect(result.player.name).toBe('Bob');
      expect(result.player.role).toBe('player');
      expect(result.gameState.players).toHaveLength(2);
    });

    it('returns error for invalid session ID', () => {
      const result = sm.joinSession('INVALID', 'player', 'Bob', 'socket-1');
      expect(result.error).toBe('Session not found');
    });

    it('adds observer without name', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const result = sm.joinSession(sessionId, 'observer', undefined, 'socket-1');

      expect(result.player.name).toBe('Observer');
      expect(result.player.role).toBe('observer');
    });

    it('increments playersJoined stat', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      sm.joinSession(sessionId, 'player', 'Bob', 'socket-1');
      sm.joinSession(sessionId, 'player', 'Carol', 'socket-2');
      expect(sm.getStats().playersJoined).toBe(2);
    });
  });

  describe('getGameState', () => {
    it('hides votes during voting phase', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.playCard(sessionId, playerId, 5);

      const state = sm.getGameState(sessionId);
      const bob = state.players.find(p => p.id === playerId);
      expect(bob.hasVoted).toBe(true);
      expect(bob.vote).toBeNull(); // hidden during voting
    });

    it('shows votes during revealed phase', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.playCard(sessionId, playerId, 8);
      sm.revealCards(sessionId);

      const state = sm.getGameState(sessionId);
      const bob = state.players.find(p => p.id === playerId);
      expect(bob.vote).toBe(8);
    });

    it('returns null for non-existent session', () => {
      expect(sm.getGameState('NOPE')).toBeNull();
    });
  });

  describe('leaveSession', () => {
    it('removes a player', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      const result = sm.leaveSession(sessionId, playerId);

      expect(result.sessionDestroyed).toBe(false);
      expect(sm.getGameState(sessionId).players).toHaveLength(1);
    });

    it('removes facilitator without promotion, leaving remaining players', () => {
      const { sessionId, facilitatorId } = sm.createSession(defaultSettings, 'Host');
      sm.joinSession(sessionId, 'player', 'Bob', 's1');
      const result = sm.leaveSession(sessionId, facilitatorId);

      expect(result.sessionDestroyed).toBe(false);
      const state = sm.getGameState(sessionId);
      expect(state.players).toHaveLength(1);
      expect(state.players[0].name).toBe('Bob');
    });

    it('destroys session when last player leaves', () => {
      const { sessionId, facilitatorId } = sm.createSession(defaultSettings, 'Host');
      const result = sm.leaveSession(sessionId, facilitatorId);

      expect(result.sessionDestroyed).toBe(true);
      expect(sm.getGameState(sessionId)).toBeNull();
    });
  });

  // --- Game actions ---

  describe('playCard', () => {
    it('allows a player to vote', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      const result = sm.playCard(sessionId, playerId, 5);

      expect(result.hasVoted).toBe(true);
      expect(result.playerId).toBe(playerId);
    });

    it('allows the facilitator to vote', () => {
      const { sessionId, facilitatorId } = sm.createSession(defaultSettings, 'Host');
      const result = sm.playCard(sessionId, facilitatorId, 13);

      expect(result.hasVoted).toBe(true);
    });

    it('rejects observers', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'observer', undefined, 's1');
      const result = sm.playCard(sessionId, playerId, 5);

      expect(result.error).toBeTruthy();
    });

    it('allows unplaying a card by sending null', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');

      sm.playCard(sessionId, playerId, 5);
      expect(sm.getGameState(sessionId).players.find(p => p.id === playerId).hasVoted).toBe(true);

      const result = sm.playCard(sessionId, playerId, null);
      expect(result.hasVoted).toBe(false);

      const state = sm.getGameState(sessionId);
      const bob = state.players.find(p => p.id === playerId);
      expect(bob.hasVoted).toBe(false);
      expect(bob.vote).toBeNull();
    });

    it('rejects votes outside voting phase', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.revealCards(sessionId);

      const result = sm.playCard(sessionId, playerId, 5);
      expect(result.error).toBe('Not in voting phase');
    });
  });

  describe('revealCards', () => {
    it('reveals all votes', () => {
      const { sessionId, facilitatorId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.playCard(sessionId, playerId, 8);
      sm.playCard(sessionId, facilitatorId, 5);

      const result = sm.revealCards(sessionId);
      expect(result.players).toBeTruthy();

      const bob = result.players.find(p => p.id === playerId);
      expect(bob.vote).toBe(8);
      const facilitator = result.players.find(p => p.id === facilitatorId);
      expect(facilitator.vote).toBe(5);
    });
  });

  describe('newRound', () => {
    it('increments round and resets votes', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.playCard(sessionId, playerId, 5);
      sm.revealCards(sessionId);

      const result = sm.newRound(sessionId);
      expect(result.currentRound).toBe(2);

      const state = sm.getGameState(sessionId);
      expect(state.phase).toBe('voting');
      expect(state.players.every(p => !p.hasVoted)).toBe(true);
    });
  });

  describe('reVote', () => {
    it('resets votes without incrementing round', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.revealCards(sessionId);

      const result = sm.reVote(sessionId);
      expect(result.currentRound).toBe(1);
      expect(result.isReVote).toBe(true);

      const state = sm.getGameState(sessionId);
      expect(state.phase).toBe('voting');
    });
  });

  // --- Disconnect / reconnect ---

  describe('disconnectPlayer', () => {
    it('marks player as disconnected', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');

      sm.disconnectPlayer(sessionId, playerId);
      const state = sm.getGameState(sessionId);
      const bob = state.players.find(p => p.id === playerId);
      expect(bob.isConnected).toBe(false);
    });

    it('auto-removes player after 5-minute grace period', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.onBroadcast = vi.fn();

      sm.disconnectPlayer(sessionId, playerId);

      // Before grace period
      expect(sm.getGameState(sessionId).players).toHaveLength(2);

      // After 5-minute grace period
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(sm.getGameState(sessionId).players).toHaveLength(1);
      expect(sm.onBroadcast).toHaveBeenCalledWith(sessionId, 'player-left', { playerId });
    });

    it('treats facilitator disconnect same as any other player', () => {
      const { sessionId, facilitatorId } = sm.createSession(defaultSettings, 'Alice');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');
      sm.onBroadcast = vi.fn();

      const result = sm.disconnectPlayer(sessionId, facilitatorId);

      // Facilitator is just marked as disconnected, no promotion
      const state = sm.getGameState(sessionId);
      expect(state.facilitatorId).toBe(facilitatorId);
      const facilitator = state.players.find(p => p.id === facilitatorId);
      expect(facilitator.isConnected).toBe(false);

      // No host-transferred broadcast
      expect(sm.onBroadcast).not.toHaveBeenCalledWith(
        sessionId, 'host-transferred', expect.anything()
      );
    });
  });

  describe('reconnectPlayer', () => {
    it('restores connected state and cancels timer', () => {
      const { sessionId } = sm.createSession(defaultSettings, 'Host');
      const { playerId } = sm.joinSession(sessionId, 'player', 'Bob', 's1');

      sm.disconnectPlayer(sessionId, playerId);
      sm.reconnectPlayer(sessionId, playerId, 'new-socket');

      const state = sm.getGameState(sessionId);
      const bob = state.players.find(p => p.id === playerId);
      expect(bob.isConnected).toBe(true);

      // Advance past grace period — player should NOT be removed
      vi.advanceTimersByTime(6 * 60 * 1000);
      expect(sm.getGameState(sessionId).players).toHaveLength(2);
    });
  });

  // --- Stats ---

  describe('getStats', () => {
    it('tracks daily stats', () => {
      sm.createSession(defaultSettings, 'Host');
      const { sessionId } = sm.createSession(defaultSettings, 'Host2');
      sm.joinSession(sessionId, 'player', 'Bob', 's1');

      const stats = sm.getStats();
      expect(stats.sessionsCreated).toBe(2);
      expect(stats.playersJoined).toBe(1);
      expect(stats.activeSessions).toBe(2);
    });
  });
});

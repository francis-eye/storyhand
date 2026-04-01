import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { GameState, Player, Role, CardValue, GamePhase } from '../types/game';
import type { GameSettings } from '../types/game';

// ── Module-scope singleton ────────────────────────────────────────────────────
// Exactly one socket per browser tab, created once at import time.
// This prevents React lifecycle (StrictMode double-mount, re-renders) from
// creating multiple connections where listeners and session diverge.
const socket = io({
  autoConnect: false,
  transports: ['websocket'],
});

// ── Socket.IO Response Types ──────────────────────────────────────────────────

interface SocketResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

interface CreateSessionData {
  sessionId: string;
  facilitatorId: string;
  gameState: GameState;
}

interface JoinSessionData {
  playerId: string;
  gameState: GameState;
}

interface ReconnectSessionData {
  gameState: GameState;
}

// ── Context Types ─────────────────────────────────────────────────────────────

interface GameActions {
  createGame: (settings: GameSettings, hostName: string) => Promise<string>;
  joinGame: (sessionId: string, role: Role, name?: string) => Promise<void>;
  playCard: (value: CardValue) => void;
  revealCards: () => void;
  startNewRound: () => void;
  reVote: () => void;
  removePlayer: (playerId: string) => void;
  kickPlayer: (targetPlayerId: string) => void;
  endSession: () => void;
  leaveGame: () => void;
  submitFeedback: (sentiment: number, comment: string) => void;
}

interface GameContextValue {
  state: GameState | null;
  currentPlayerId: string | null;
  selectedCard: CardValue | null;
  actions: GameActions;
  error: string | null;
  isReconnecting: boolean;
  missedRounds: number;
  clearMissedRounds: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(() => {
    // Start as true if we have stored session info and URL matches — prevents flash
    const storedSessionId = sessionStorage.getItem('storyhand-sessionId');
    const storedPlayerId = sessionStorage.getItem('storyhand-playerId');
    if (!storedSessionId || !storedPlayerId) return false;
    const pathMatch = window.location.pathname.match(/^\/session\/(.+)$/);
    return !!(pathMatch && pathMatch[1] === storedSessionId);
  });
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [missedRounds, setMissedRounds] = useState<number>(0);

  // Pending reveal data — stored while countdown runs, applied when it finishes
  const pendingRevealRef = useRef<Player[] | null>(null);

  useEffect(() => {
    gameStateRef.current = state;
  }, [state]);

  // ── Socket Connection ─────────────────────────────────────────────────────
  // The socket is a module-scope singleton (above). ensureConnected just
  // calls .connect() if not already connected — no new instances created.

  const ensureConnected = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }, []);

  // ── Event Listeners ───────────────────────────────────────────────────────
  // Registered once on the socket instance. These fire regardless of whether
  // the socket is currently connected — Socket.IO replays missed events on
  // reconnection.

  useEffect(() => {
    socket.on('player-joined', ({ player }: { player: Player }) => {
      setState(prev => {
        if (!prev) return prev;
        // Dedup guard: don't add if player already exists (e.g. from callback)
        if (prev.players.some(p => p.id === player.id)) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    });

    socket.on('player-left', ({ playerId }: { playerId: string }) => {
      setState(prev => {
        if (!prev) return prev;
        return { ...prev, players: prev.players.filter(p => p.id !== playerId) };
      });
    });

    socket.on('card-played', ({ playerId, hasVoted }: { playerId: string; hasVoted: boolean }) => {
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === playerId ? { ...p, hasVoted } : p
          ),
        };
      });
    });

    socket.on('cards-revealed', ({ players }: { players: Player[] }) => {
      setState(prev => {
        if (!prev) return prev;

        if (prev.settings.showCountdown) {
          pendingRevealRef.current = players;

          if (countdownRef.current) clearInterval(countdownRef.current);

          const withCountdown = { ...prev, phase: 'countdown' as GamePhase, countdownValue: 3 };

          countdownRef.current = setInterval(() => {
            setState(s => {
              if (!s || s.phase !== 'countdown') {
                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = null;
                return s;
              }
              const next = (s.countdownValue ?? 3) - 1;
              if (next <= 0) {
                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = null;
                const revealedPlayers = pendingRevealRef.current || players;
                pendingRevealRef.current = null;
                return { ...s, phase: 'revealed' as GamePhase, countdownValue: null, players: revealedPlayers };
              }
              return { ...s, countdownValue: next };
            });
          }, 1000);

          return withCountdown;
        }

        return { ...prev, phase: 'revealed', players, countdownValue: null };
      });
    });

    socket.on('round-reset', ({ currentRound, isReVote }: { currentRound: number; isReVote: boolean }) => {
      setSelectedCard(null);
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: 'voting',
          currentRound,
          isReVoting: isReVote,
          countdownValue: null,
          players: prev.players.map(p => ({ ...p, vote: null, hasVoted: false })),
        };
      });
    });

    socket.on('phase-changed', ({ phase }: { phase: GamePhase }) => {
      setState(prev => prev ? { ...prev, phase } : prev);
    });

    socket.on('player-disconnected', ({ playerId }: { playerId: string }) => {
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === playerId ? { ...p, isConnected: false, disconnectedAt: Date.now() } : p
          ),
        };
      });
    });

    socket.on('player-reconnected', ({ playerId }: { playerId: string }) => {
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === playerId ? { ...p, isConnected: true, disconnectedAt: null } : p
          ),
        };
      });
    });

    socket.on('session-expired', () => {
      setState(null);
      setCurrentPlayerId(null);
      setSelectedCard(null);
      sessionStorage.removeItem('storyhand-sessionId');
      sessionStorage.removeItem('storyhand-playerId');
      setError('Session has ended.');
    });

    // On every socket connection (initial + reconnections), re-join the
    // server-side room if we have an active session. This handles:
    // - Transport reconnections (socket.id changes, room membership lost)
    // - Page refresh (sessionStorage has session info)
    // The server's reconnect-session handler is idempotent.
    socket.on('connect', () => {
      const sessionId = sessionStorage.getItem('storyhand-sessionId');
      const playerId = sessionStorage.getItem('storyhand-playerId');
      if (!sessionId || !playerId) return;

      socket.emit(
        'reconnect-session',
        { sessionId, playerId },
        (response: SocketResponse<ReconnectSessionData>) => {
          if (response.success && response.data) {
            setState(response.data.gameState);
            setCurrentPlayerId(playerId);
          } else {
            // Session no longer exists on server
            sessionStorage.removeItem('storyhand-sessionId');
            sessionStorage.removeItem('storyhand-playerId');
          }
          setIsReconnecting(false);
        }
      );
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('card-played');
      socket.off('cards-revealed');
      socket.off('round-reset');
      socket.off('phase-changed');
      socket.off('player-disconnected');
      socket.off('player-reconnected');
      socket.off('session-expired');
      socket.off('connect');
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Reconnection (page refresh) ──────────────────────────────────────────
  // If sessionStorage has session info and URL matches, connect the socket.
  // The 'connect' handler above will automatically emit reconnect-session.

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('storyhand-sessionId');
    const storedPlayerId = sessionStorage.getItem('storyhand-playerId');

    if (!storedSessionId || !storedPlayerId) {
      setIsReconnecting(false);
      return;
    }

    // Only reconnect if URL matches the stored session
    const pathMatch = window.location.pathname.match(/^\/session\/(.+)$/);
    if (!pathMatch || pathMatch[1] !== storedSessionId) {
      sessionStorage.removeItem('storyhand-sessionId');
      sessionStorage.removeItem('storyhand-playerId');
      setIsReconnecting(false);
      return;
    }

    // Connect the socket — the 'connect' handler will rejoin the room
    ensureConnected();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureConnected]);

  // ── Page Visibility API ──────────────────────────────────────────────────
  // When the user returns to the tab after backgrounding, reconnect if needed.

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const storedSessionId = sessionStorage.getItem('storyhand-sessionId');
      const storedPlayerId = sessionStorage.getItem('storyhand-playerId');
      if (!storedSessionId || !storedPlayerId) return;

      if (socket.connected && gameStateRef.current) return;

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit(
        'reconnect-session',
        { sessionId: storedSessionId, playerId: storedPlayerId },
        (response: any) => {
          if (response.error || !response.success || !response.data) {
            sessionStorage.removeItem('storyhand-sessionId');
            sessionStorage.removeItem('storyhand-playerId');
          } else {
            const prevRound = gameStateRef.current?.currentRound;
            setState(response.data.gameState);
            const currentPlayer = response.data.gameState.players.find(
              (p: any) => p.id === storedPlayerId
            );
            if (currentPlayer) {
              setCurrentPlayerId(storedPlayerId);
            }
            if (prevRound && response.data.gameState.currentRound > prevRound) {
              setMissedRounds(response.data.gameState.currentRound - prevRound);
            }
          }
        }
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createGame = useCallback((settings: GameSettings, hostName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = ensureConnected();
      setError(null);

      socket.emit('create-session', { settings, hostName }, (response: SocketResponse<CreateSessionData>) => {
        if (!response.success || !response.data) {
          const msg = response.error || 'Failed to create session';
          setError(msg);
          reject(new Error(msg));
          return;
        }

        const { sessionId, facilitatorId, gameState } = response.data;
        setState(gameState);
        setCurrentPlayerId(facilitatorId);
        sessionStorage.setItem('storyhand-sessionId', sessionId);
        sessionStorage.setItem('storyhand-playerId', facilitatorId);
        resolve(sessionId);
      });
    });
  }, [ensureConnected]);

  const joinGame = useCallback((sessionId: string, role: Role, name?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = ensureConnected();
      setError(null);

      socket.emit('join-session', { sessionId, role, name }, (response: SocketResponse<JoinSessionData>) => {
        if (!response.success || !response.data) {
          const msg = response.error || 'Failed to join session';
          setError(msg);
          reject(new Error(msg));
          return;
        }

        const { playerId, gameState } = response.data;
        setState(gameState);
        setCurrentPlayerId(playerId);
        sessionStorage.setItem('storyhand-sessionId', sessionId);
        sessionStorage.setItem('storyhand-playerId', playerId);
        resolve();
      });
    });
  }, [ensureConnected]);

  const playCard = useCallback((value: CardValue) => {
    if (!state || !currentPlayerId) return;

    // Toggle: clicking the same card unplays it
    const newValue = selectedCard === value ? null : value;
    setSelectedCard(newValue);

    socket.emit('play-card', {
      sessionId: state.sessionId,
      playerId: currentPlayerId,
      value: newValue,
    });
  }, [state, currentPlayerId, selectedCard]);

  const revealCards = useCallback(() => {
    if (!state) return;
    socket.emit('reveal-cards', { sessionId: state.sessionId });
  }, [state]);

  const startNewRound = useCallback(() => {
    if (!state) return;
    socket.emit('new-round', { sessionId: state.sessionId });
  }, [state]);

  const reVote = useCallback(() => {
    if (!state) return;
    socket.emit('re-vote', { sessionId: state.sessionId });
  }, [state]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!state) return;
    socket.emit('kick-player', {
      sessionId: state.sessionId,
      targetPlayerId,
    });
  }, [state]);

  const endSession = useCallback(() => {
    if (!state) return;
    socket.emit('end-session', { sessionId: state.sessionId }, () => {
      sessionStorage.removeItem('storyhand-sessionId');
      sessionStorage.removeItem('storyhand-playerId');
      setState(null);
      setCurrentPlayerId(null);
      setSelectedCard(null);
    });
  }, [state]);

  const removePlayer = useCallback((playerId: string) => {
    if (!state) return;
    socket.emit('leave-session', {
      sessionId: state.sessionId,
      playerId,
    });
  }, [state]);

  const leaveGame = useCallback(() => {
    sessionStorage.removeItem('storyhand-sessionId');
    sessionStorage.removeItem('storyhand-playerId');

    if (state && currentPlayerId && socket.connected) {
      socket.emit(
        'leave-session',
        { sessionId: state.sessionId, playerId: currentPlayerId },
        () => {
          socket.disconnect();
        }
      );
      setTimeout(() => {
        socket.disconnect();
      }, 2000);
    } else {
      socket.disconnect();
    }

    setState(null);
    setCurrentPlayerId(null);
    setSelectedCard(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [state, currentPlayerId]);

  const submitFeedback = useCallback((sentiment: number, comment: string) => {
    const s = ensureConnected();
    s.emit('submit-feedback', {
      sentiment,
      comment: comment || null,
      context: {
        sessionId: state?.sessionId || null,
        tableTheme: state?.settings.tableTheme || null,
        playerCount: state?.players.length || null,
        roundsPlayed: state?.currentRound ? state.currentRound - 1 : null,
        role: currentPlayerId
          ? state?.players.find(p => p.id === currentPlayerId)?.role || null
          : null,
      },
    });
  }, [ensureConnected, state, currentPlayerId]);

  // ── Context Value ─────────────────────────────────────────────────────────

  const actions: GameActions = {
    createGame,
    joinGame,
    playCard,
    revealCards,
    startNewRound,
    reVote,
    removePlayer,
    kickPlayer,
    endSession,
    leaveGame,
    submitFeedback,
  };

  const clearMissedRounds = useCallback(() => setMissedRounds(0), []);

  return (
    <GameContext.Provider value={{ state, currentPlayerId, selectedCard, actions, error, isReconnecting, missedRounds, clearMissedRounds }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

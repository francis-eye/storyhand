import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameState, Player, Role, CardValue, GamePhase } from '../types/game';
import type { GameSettings } from '../types/game';

// ── Socket.IO Response Types ──────────────────────────────────────────────────

interface SocketResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

interface CreateSessionData {
  sessionId: string;
  hostId: string;
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
  transferHost: (newHostId: string) => void;
  leaveGame: () => void;
}

interface GameContextValue {
  state: GameState | null;
  currentPlayerId: string | null;
  actions: GameActions;
  error: string | null;
  isReconnecting: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(() => {
    // Start as true if we have stored session info and URL matches — prevents flash
    const storedSessionId = sessionStorage.getItem('storyhand-sessionId');
    const storedPlayerId = sessionStorage.getItem('storyhand-playerId');
    if (!storedSessionId || !storedPlayerId) return false;
    const pathMatch = window.location.pathname.match(/^\/session\/(.+)$/);
    return !!(pathMatch && pathMatch[1] === storedSessionId);
  });
  const socketRef = useRef<Socket | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pending reveal data — stored while countdown runs, applied when it finishes
  const pendingRevealRef = useRef<Player[] | null>(null);

  // ── Socket Connection ─────────────────────────────────────────────────────

  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      socketRef.current = io({ autoConnect: false });
    }
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
    return socketRef.current;
  }, []);

  // ── Event Listeners ───────────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();

    socket.on('player-joined', ({ player }: { player: Player }) => {
      setState(prev => {
        if (!prev) return prev;
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
          // Start local countdown, then reveal
          pendingRevealRef.current = players;

          if (countdownRef.current) clearInterval(countdownRef.current);

          // Set countdown phase immediately
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

        // No countdown — reveal immediately
        return { ...prev, phase: 'revealed', players, countdownValue: null };
      });
    });

    socket.on('round-reset', ({ currentRound, isReVote }: { currentRound: number; isReVote: boolean }) => {
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

    socket.on('host-transferred', ({ oldHostId, newHostId }: { oldHostId: string; newHostId: string }) => {
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: newHostId,
          players: prev.players.map(p => {
            if (p.id === oldHostId) return { ...p, role: 'player' as Role };
            if (p.id === newHostId) return { ...p, role: 'host' as Role };
            return p;
          }),
        };
      });
    });

    socket.on('session-expired', () => {
      setState(null);
      setCurrentPlayerId(null);
      sessionStorage.removeItem('storyhand-sessionId');
      sessionStorage.removeItem('storyhand-playerId');
      setError('Session has ended — the host left.');
    });

    // When the socket reconnects (transport-level), the server creates a new socket
    // that is NOT in any room. Re-emit reconnect-session to rejoin the room and
    // get fresh state. Without this, the client silently stops receiving broadcasts.
    socket.io.on('reconnect', () => {
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
          }
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
      socket.off('host-transferred');
      socket.off('session-expired');
      socket.io.off('reconnect');
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [getSocket]);

  // ── Reconnection (page refresh) ──────────────────────────────────────────

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('storyhand-sessionId');
    const storedPlayerId = sessionStorage.getItem('storyhand-playerId');

    if (!storedSessionId || !storedPlayerId) {
      setIsReconnecting(false);
      return;
    }
    if (state) return; // already have state

    // Only reconnect if URL matches the stored session
    const pathMatch = window.location.pathname.match(/^\/session\/(.+)$/);
    if (!pathMatch || pathMatch[1] !== storedSessionId) {
      sessionStorage.removeItem('storyhand-sessionId');
      sessionStorage.removeItem('storyhand-playerId');
      setIsReconnecting(false);
      return;
    }

    const socket = getSocket();
    socket.emit(
      'reconnect-session',
      { sessionId: storedSessionId, playerId: storedPlayerId },
      (response: SocketResponse<ReconnectSessionData>) => {
        if (response.success && response.data) {
          setState(response.data.gameState);
          setCurrentPlayerId(storedPlayerId);
        } else {
          sessionStorage.removeItem('storyhand-sessionId');
          sessionStorage.removeItem('storyhand-playerId');
        }
        setIsReconnecting(false);
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSocket]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createGame = useCallback((settings: GameSettings, hostName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      setError(null);

      socket.emit('create-session', { settings, hostName }, (response: SocketResponse<CreateSessionData>) => {
        if (!response.success || !response.data) {
          const msg = response.error || 'Failed to create session';
          setError(msg);
          reject(new Error(msg));
          return;
        }

        const { sessionId, hostId, gameState } = response.data;
        setState(gameState);
        setCurrentPlayerId(hostId);
        sessionStorage.setItem('storyhand-sessionId', sessionId);
        sessionStorage.setItem('storyhand-playerId', hostId);
        resolve(sessionId);
      });
    });
  }, [getSocket]);

  const joinGame = useCallback((sessionId: string, role: Role, name?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
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
  }, [getSocket]);

  const playCard = useCallback((value: CardValue) => {
    if (!state || !currentPlayerId) return;
    socketRef.current?.emit('play-card', {
      sessionId: state.sessionId,
      playerId: currentPlayerId,
      value,
    });
  }, [state, currentPlayerId]);

  const revealCards = useCallback(() => {
    if (!state) return;
    socketRef.current?.emit('reveal-cards', { sessionId: state.sessionId });
  }, [state]);

  const startNewRound = useCallback(() => {
    if (!state) return;
    socketRef.current?.emit('new-round', { sessionId: state.sessionId });
  }, [state]);

  const reVote = useCallback(() => {
    if (!state) return;
    socketRef.current?.emit('re-vote', { sessionId: state.sessionId });
  }, [state]);

  const transferHost = useCallback((newHostId: string) => {
    if (!state) return;
    socketRef.current?.emit('transfer-host', {
      sessionId: state.sessionId,
      newHostId,
    });
  }, [state]);

  const removePlayer = useCallback((playerId: string) => {
    if (!state) return;
    socketRef.current?.emit('leave-session', {
      sessionId: state.sessionId,
      playerId,
    });
  }, [state]);

  const leaveGame = useCallback(() => {
    sessionStorage.removeItem('storyhand-sessionId');
    sessionStorage.removeItem('storyhand-playerId');

    if (state && currentPlayerId && socketRef.current) {
      const socket = socketRef.current;
      socket.emit(
        'leave-session',
        { sessionId: state.sessionId, playerId: currentPlayerId },
        () => {
          // Server acknowledged — safe to disconnect
          socket.disconnect();
        }
      );
      // Fallback: disconnect after 2 seconds if server never acks
      setTimeout(() => {
        socket.disconnect();
      }, 2000);
    } else {
      socketRef.current?.disconnect();
    }

    socketRef.current = null;
    setState(null);
    setCurrentPlayerId(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [state, currentPlayerId]);

  // ── Context Value ─────────────────────────────────────────────────────────

  const actions: GameActions = {
    createGame,
    joinGame,
    playCard,
    revealCards,
    startNewRound,
    reVote,
    removePlayer,
    transferHost,
    leaveGame,
  };

  return (
    <GameContext.Provider value={{ state, currentPlayerId, actions, error, isReconnecting }}>
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

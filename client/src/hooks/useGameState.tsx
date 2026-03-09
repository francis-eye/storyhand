import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameState, Player, Role, CardValue, GamePhase } from '../types/game';
import type { GameSettings } from '../types/game';

interface GameActions {
  createGame: (settings: GameSettings, hostName: string) => Promise<string>;
  joinGame: (sessionId: string, role: Role, name?: string) => Promise<void>;
  playCard: (value: CardValue) => void;
  revealCards: () => void;
  startNewRound: () => void;
  reVote: () => void;
  removePlayer: (playerId: string) => void;
  leaveGame: () => void;
}

interface GameContextValue {
  state: GameState | null;
  currentPlayerId: string | null;
  actions: GameActions;
  error: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pending reveal data — stored while countdown runs, applied when it finishes
  const pendingRevealRef = useRef<Player[] | null>(null);

  // Get or create socket connection
  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      socketRef.current = io({ autoConnect: false });
    }
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
    return socketRef.current;
  }, []);

  // Set up socket event listeners
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

    socket.on('session-expired', () => {
      setState(null);
      setCurrentPlayerId(null);
      setError('Session has ended — the host left.');
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
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [getSocket]);

  // --- Actions ---

  const createGame = useCallback((settings: GameSettings, hostName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      setError(null);

      socket.emit('create-session', { settings, hostName }, (response: any) => {
        if (!response.success) {
          setError(response.error);
          reject(new Error(response.error));
          return;
        }

        const { sessionId, hostId, gameState } = response.data;
        setState(gameState);
        setCurrentPlayerId(hostId);
        resolve(sessionId);
      });
    });
  }, [getSocket]);

  const joinGame = useCallback((sessionId: string, role: Role, name?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      setError(null);

      socket.emit('join-session', { sessionId, role, name }, (response: any) => {
        if (!response.success) {
          setError(response.error);
          reject(new Error(response.error));
          return;
        }

        const { playerId, gameState } = response.data;
        setState(gameState);
        setCurrentPlayerId(playerId);
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

  const removePlayer = useCallback((playerId: string) => {
    if (!state) return;
    socketRef.current?.emit('leave-session', {
      sessionId: state.sessionId,
      playerId,
    });
  }, [state]);

  const leaveGame = useCallback(() => {
    if (state && currentPlayerId) {
      socketRef.current?.emit('leave-session', {
        sessionId: state.sessionId,
        playerId: currentPlayerId,
      });
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState(null);
    setCurrentPlayerId(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [state, currentPlayerId]);

  const actions: GameActions = {
    createGame,
    joinGame,
    playCard,
    revealCards,
    startNewRound,
    reVote,
    removePlayer,
    leaveGame,
  };

  return (
    <GameContext.Provider value={{ state, currentPlayerId, actions, error }}>
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

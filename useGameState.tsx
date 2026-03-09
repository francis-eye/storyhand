import React, { useEffect, useState, createContext, useContext } from 'react'
import {
  GameState,
  GameSettings,
  Player,
  Role,
  CardValue,
  FIBONACCI_DECK,
} from '../types/game'
import { generateSessionId, generatePlayerId } from '../utils/session'
interface GameContextType {
  gameState: GameState | null
  currentUser: Player | null
  createGame: (settings: GameSettings, hostName: string) => string
  joinGame: (sessionId: string, role: Role, name?: string) => void
  playCard: (playerId: string, value: CardValue) => void
  revealCards: () => void
  startNewRound: () => void
  reVote: () => void
  removePlayer: (playerId: string) => void
  leaveGame: () => void
}
const GameContext = createContext<GameContextType | undefined>(undefined)
const BOT_NAMES = ['Alex (Bot)', 'Sam (Bot)', 'Jordan (Bot)']
export const GameProvider: React.FC<{
  children: ReactNode
}> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentUser, setCurrentUser] = useState<Player | null>(null)
  // Simulate bot voting
  useEffect(() => {
    if (gameState?.phase === 'voting') {
      const bots = gameState.players.filter(
        (p) => p.name.includes('(Bot)') && !p.hasVoted,
      )
      bots.forEach((bot) => {
        const delay = Math.random() * 3000 + 1000 // 1-4 seconds
        setTimeout(() => {
          setGameState((prev) => {
            if (!prev || prev.phase !== 'voting') return prev
            const randomCard =
              FIBONACCI_DECK[
                Math.floor(Math.random() * (FIBONACCI_DECK.length - 2))
              ] // Avoid ? and coffee for bots usually
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === bot.id
                  ? {
                      ...p,
                      hasVoted: true,
                      vote: randomCard,
                    }
                  : p,
              ),
            }
          })
        }, delay)
      })
    }
  }, [gameState?.phase, gameState?.currentRound])
  const createGame = (settings: GameSettings, hostName: string) => {
    const sessionId = generateSessionId()
    const hostId = generatePlayerId()
    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      role: 'host',
      hasVoted: false,
      isConnected: true,
    }
    // Add some simulated players for demo purposes
    const bots: Player[] = BOT_NAMES.slice(0, 2).map((name) => ({
      id: generatePlayerId(),
      name,
      role: 'player',
      hasVoted: false,
      isConnected: true,
    }))
    const newGameState: GameState = {
      sessionId,
      settings,
      phase: 'voting',
      players: [hostPlayer, ...bots],
      currentRound: 1,
      hostId,
    }
    setGameState(newGameState)
    setCurrentUser(hostPlayer)
    return sessionId
  }
  const joinGame = (sessionId: string, role: Role, name?: string) => {
    // In a real app, we'd fetch the game state from a server
    // For this MVP, if the game doesn't exist locally, we create a mock one to allow joining
    const playerId = generatePlayerId()
    const newPlayer: Player = {
      id: playerId,
      name: name || 'Anonymous Observer',
      role,
      hasVoted: false,
      isConnected: true,
    }
    setCurrentUser(newPlayer)
    setGameState((prev) => {
      if (prev && prev.sessionId === sessionId) {
        return {
          ...prev,
          players: [...prev.players, newPlayer],
        }
      }
      // Mock game for demo if joining a non-existent local session
      return {
        sessionId,
        settings: {
          gameName: 'Joined Session',
          votingSystem: 'fibonacci',
          showAverage: true,
          showCountdown: true,
          inactivityTimeout: 30,
        },
        phase: 'voting',
        players: [
          {
            id: 'host-1',
            name: 'Host',
            role: 'host',
            hasVoted: false,
            isConnected: true,
          },
          newPlayer,
        ],
        currentRound: 1,
        hostId: 'host-1',
      }
    })
  }
  const playCard = (playerId: string, value: CardValue) => {
    setGameState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                vote: value,
                hasVoted: true,
              }
            : p,
        ),
      }
    })
  }
  const revealCards = () => {
    if (!gameState) return
    if (gameState.settings.showCountdown) {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: 'countdown',
            }
          : prev,
      )
      setTimeout(() => {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                phase: 'revealed',
              }
            : prev,
        )
      }, 3000)
    } else {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: 'revealed',
            }
          : prev,
      )
    }
  }
  const resetVotes = (incrementRound: boolean) => {
    setGameState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        phase: 'voting',
        currentRound: incrementRound
          ? prev.currentRound + 1
          : prev.currentRound,
        players: prev.players.map((p) => ({
          ...p,
          vote: undefined,
          hasVoted: false,
        })),
      }
    })
  }
  const startNewRound = () => resetVotes(true)
  const reVote = () => resetVotes(false)
  const removePlayer = (playerId: string) => {
    setGameState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
      }
    })
  }
  const leaveGame = () => {
    if (currentUser && gameState) {
      removePlayer(currentUser.id)
    }
    setCurrentUser(null)
    setGameState(null)
  }
  return (
    <GameContext.Provider
      value={{
        gameState,
        currentUser,
        createGame,
        joinGame,
        playCard,
        revealCards,
        startNewRound,
        reVote,
        removePlayer,
        leaveGame,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

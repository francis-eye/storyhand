import React, { useEffect, useState } from 'react'
import { Typography } from '@mui/material'
import { GameState } from '../types/game'
import { PlayingCard } from './PlayingCard'
import { ResultsPanel } from './ResultsPanel'
interface GameTableProps {
  gameState: GameState
}
export const GameTable: React.FC<GameTableProps> = ({ gameState }) => {
  const [countdown, setCountdown] = useState(3)
  const players = gameState.players.filter((p) => p.role === 'player')
  const votedPlayers = players.filter((p) => p.hasVoted)
  const isRevealed = gameState.phase === 'revealed'
  const isCountdown = gameState.phase === 'countdown'
  useEffect(() => {
    if (isCountdown) {
      setCountdown(3)
      const timer1 = setTimeout(() => setCountdown(2), 1000)
      const timer2 = setTimeout(() => setCountdown(1), 2000)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [isCountdown])
  // Calculate positions for cards in a circle/ellipse
  const getCardStyle = (index: number, total: number) => {
    if (total === 0) return {}
    // Spread cards in a slight arc or grid depending on count
    // For simplicity in MVP, we'll use a flex wrap layout with a nice gap,
    // but give them slight random rotations for a "thrown on table" look
    const randomRotation = ((index * 13.7) % 20) - 10 // Pseudo-random -10 to 10 deg
    return {
      transform: `rotate(${randomRotation}deg)`,
      transition: 'all 0.5s ease-out',
    }
  }
  return (
    <div className="h-full w-full poker-table-bg rounded-xl border-8 border-gray-300/50 flex flex-col items-center justify-center relative overflow-hidden p-8 shadow-inner">
      {/* Center Area */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        {gameState.phase === 'voting' && (
          <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-sm border border-gray-200">
            <Typography variant="h6" className="font-medium text-gray-600">
              {votedPlayers.length} of {players.length} voted
            </Typography>
          </div>
        )}

        {isCountdown && (
          <Typography
            variant="h1"
            className="font-black text-indigo-600 animate-pulse drop-shadow-lg"
            style={{
              fontSize: '8rem',
            }}
          >
            {countdown}
          </Typography>
        )}

        {isRevealed && (
          <div className="w-full max-w-2xl pointer-events-auto z-20">
            <ResultsPanel
              players={gameState.players}
              showAverage={gameState.settings.showAverage}
            />
          </div>
        )}
      </div>

      {/* Cards Area */}
      <div className="w-full h-full flex flex-wrap items-center justify-center gap-4 sm:gap-8 z-0">
        {votedPlayers.map((player, idx) => (
          <div
            key={player.id}
            className="flex flex-col items-center transition-all duration-500"
            style={isRevealed ? {} : getCardStyle(idx, votedPlayers.length)}
          >
            <PlayingCard
              value={player.vote}
              faceUp={isRevealed}
              size="medium"
            />
            <Typography
              variant="caption"
              className={`mt-3 px-3 py-1 rounded-full font-bold shadow-sm ${isRevealed ? 'bg-white text-gray-800' : 'bg-gray-800/70 text-white'}`}
            >
              {player.name}
            </Typography>
          </div>
        ))}

        {players.length === 0 && (
          <Typography variant="h5" className="text-gray-400 font-medium italic">
            Waiting for players to join...
          </Typography>
        )}
      </div>
    </div>
  )
}

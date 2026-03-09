import React from 'react'
import { Paper, Typography } from '@mui/material'
import { CardValue } from '../types/game'
interface PlayingCardProps {
  value?: CardValue
  faceUp: boolean
  size?: 'small' | 'medium' | 'large'
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}
export const PlayingCard: React.FC<PlayingCardProps> = ({
  value,
  faceUp,
  size = 'medium',
  selected = false,
  onClick,
  disabled = false,
}) => {
  const sizeClasses = {
    small: 'w-12 h-16 text-sm',
    medium: 'w-16 h-24 sm:w-20 sm:h-28 text-xl sm:text-2xl',
    large: 'w-20 h-28 sm:w-24 sm:h-36 text-2xl sm:text-4xl',
  }
  const isCoffee = value === '☕'
  const isQuestion = value === '?'
  return (
    <div
      className={`relative perspective-1000 ${sizeClasses[size]} ${onClick && !disabled ? 'cursor-pointer' : ''} ${disabled ? 'opacity-80' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={{
        transition: 'transform 0.2s ease-in-out',
        transform: selected ? 'translateY(-12px) scale(1.05)' : 'none',
      }}
    >
      <div
        className="w-full h-full relative transform-style-3d transition-transform duration-500 ease-in-out"
        style={{
          transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Card Back (Face Down) */}
        <Paper
          elevation={selected ? 8 : 2}
          className={`absolute w-full h-full backface-hidden rounded-lg border-2 border-white flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 ${selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
        >
          <div className="w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <div className="absolute inset-2 border border-white/30 rounded-md" />
        </Paper>

        {/* Card Front (Face Up) */}
        <Paper
          elevation={selected ? 8 : 2}
          className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-lg border-2 flex flex-col items-center justify-center bg-white ${selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}
        >
          {value !== undefined && (
            <>
              {/* Top Left Mini Value */}
              <div className="absolute top-1 left-1.5 sm:top-2 sm:left-2 text-xs sm:text-sm font-bold text-indigo-900">
                {value}
              </div>

              {/* Center Main Value */}
              <Typography
                variant="h4"
                className={`font-bold ${isCoffee ? '' : 'text-indigo-900'} ${isQuestion ? 'text-indigo-600' : ''}`}
                style={{
                  fontSize: size === 'small' ? '1rem' : undefined,
                }}
              >
                {value}
              </Typography>

              {/* Bottom Right Mini Value (Inverted) */}
              <div className="absolute bottom-1 right-1.5 sm:bottom-2 sm:right-2 text-xs sm:text-sm font-bold text-indigo-900 rotate-180">
                {value}
              </div>
            </>
          )}
        </Paper>
      </div>
    </div>
  )
}

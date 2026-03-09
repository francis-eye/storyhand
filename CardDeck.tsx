import React from 'react'
import { Typography } from '@mui/material'
import { FIBONACCI_DECK, CardValue } from '../types/game'
import { PlayingCard } from './PlayingCard'
interface CardDeckProps {
  selectedCard?: CardValue
  onSelectCard: (value: CardValue) => void
  disabled: boolean
}
export const CardDeck: React.FC<CardDeckProps> = ({
  selectedCard,
  onSelectCard,
  disabled,
}) => {
  return (
    <div className="w-full bg-white border-t border-gray-200 py-4 px-2 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30 relative">
      <Typography
        variant="subtitle2"
        className="text-center text-gray-500 font-bold uppercase tracking-widest mb-4"
      >
        Select your estimate
      </Typography>

      <div className="flex overflow-x-auto hide-scrollbar pb-6 pt-2 px-4 gap-2 sm:gap-4 justify-start md:justify-center items-end">
        {FIBONACCI_DECK.map((value) => (
          <div key={value.toString()} className="flex-shrink-0">
            <PlayingCard
              value={value}
              faceUp={true}
              size="large"
              selected={selectedCard === value}
              onClick={() => onSelectCard(value)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

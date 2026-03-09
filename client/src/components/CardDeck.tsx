import { FIBONACCI_DECK, type CardValue } from '../types/game';
import PlayingCard from './PlayingCard';

interface CardDeckProps {
  selectedValue: CardValue | null;
  onSelect: (value: CardValue) => void;
  disabled?: boolean;
}

// Horizontal card deck for players to select their vote
export default function CardDeck({ selectedValue, onSelect, disabled = false }: CardDeckProps) {
  return (
    <div className="w-full overflow-x-auto py-4 px-2">
      <div className="flex gap-2 justify-center min-w-max">
        {FIBONACCI_DECK.map((value) => (
          <PlayingCard
            key={String(value)}
            value={value}
            faceUp={true}
            selected={selectedValue === value}
            size="medium"
            disabled={disabled}
            onClick={() => onSelect(value)}
          />
        ))}
      </div>
    </div>
  );
}

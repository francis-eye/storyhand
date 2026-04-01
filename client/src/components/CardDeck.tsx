import { useRef, useState, useEffect } from 'react';
import { FIBONACCI_DECK, type CardValue } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import PlayingCard from './PlayingCard';
import { useIsMobile } from '../hooks/useIsMobile';

interface CardDeckProps {
  selectedValue: CardValue | null;
  onSelect: (value: CardValue) => void;
  disabled?: boolean;
  theme: ThemeConfig;
}

// Horizontal card deck for players to select their vote
// On mobile: smaller cards with scroll fade indicator
export default function CardDeck({ selectedValue, onSelect, disabled = false, theme }: CardDeckProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  // Check if scrollable content extends beyond the visible area
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasMore = el.scrollWidth - el.scrollLeft - el.clientWidth > 2;
      setShowFade(hasMore);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div className={`relative w-full border-t ${theme.deck.border || 'border-[var(--deck-tray-border)]'} ${theme.deck.background || 'bg-[var(--deck-tray-bg)]'}`}>
      <div ref={scrollRef} className="w-full overflow-x-auto py-2 md:py-4 px-2">
        <div className="flex gap-1.5 md:gap-2 justify-center min-w-max">
          {FIBONACCI_DECK.map((value) => (
            <PlayingCard
              key={String(value)}
              value={value}
              faceUp={true}
              selected={selectedValue === value}
              size={isMobile ? 'small' : 'medium'}
              disabled={disabled}
              onClick={() => onSelect(value)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* Scroll fade indicator — mobile only */}
      {showFade && (
        <div className={`md:hidden absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l ${theme.deck.fadeGradient} to-transparent`} />
      )}
    </div>
  );
}

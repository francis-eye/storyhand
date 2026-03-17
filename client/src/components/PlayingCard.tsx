import type { CardValue } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';

interface PlayingCardProps {
  value: CardValue;
  faceUp?: boolean;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
  theme?: ThemeConfig;
}

// Individual playing card with 3D flip animation
export default function PlayingCard({
  value,
  faceUp = false,
  selected = false,
  size = 'medium',
  onClick,
  disabled = false,
  theme,
}: PlayingCardProps) {
  const sizeClasses = {
    small: 'w-10 h-14 text-xs',
    medium: 'w-16 h-24 text-base',
    large: 'w-20 h-30 text-lg',
  };

  const displayValue = String(value);

  // Theme-aware classes with fallbacks to classic
  const rounded = theme?.card.rounded ?? 'rounded-lg';
  const faceUpBg = theme?.card.faceUpBg ?? 'bg-white';
  const faceUpBorder = theme?.card.faceUpBorder ?? 'border-gray-300';
  const faceUpSelectedBorder = theme?.card.faceUpSelectedBorder ?? 'border-blue-600 ring-2 ring-blue-300';
  const faceUpHoverBorder = theme?.card.faceUpHoverBorder ?? 'hover:border-blue-400';
  const faceUpText = theme?.card.faceUpText ?? 'text-gray-800';
  const faceUpCornerText = theme?.card.faceUpCornerText ?? 'text-gray-600';
  const faceDownBg = theme?.card.faceDownBg ?? 'linear-gradient(135deg, #4f46e5, #7c3aed)';
  const faceDownBorder = theme?.card.faceDownBorder ?? 'border-gray-400 rounded-lg';
  const faceDownInner = theme?.card.faceDownInner ?? 'border-white/30 rounded-sm';

  return (
    <div
      className={`relative cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ perspective: '600px' }}
      onClick={!disabled ? onClick : undefined}
    >
      <div
        className={`${sizeClasses[size]} transition-transform duration-500 relative`}
        style={{
          transformStyle: 'preserve-3d',
          transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
        }}
      >
        {/* Front face */}
        <div
          className={`absolute inset-0 ${rounded} border-2 flex flex-col items-center justify-center ${faceUpBg}
            ${selected ? `${faceUpSelectedBorder} -translate-y-2` : faceUpBorder}
            ${!disabled && !selected ? `${faceUpHoverBorder} hover:-translate-y-1` : ''}
            transition-all`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className={`absolute top-1 left-1.5 text-[10px] font-semibold ${faceUpCornerText}`}>
            {displayValue}
          </span>
          <span className={`font-bold ${faceUpText}`}>{displayValue}</span>
          <span className={`absolute bottom-1 right-1.5 text-[10px] font-semibold ${faceUpCornerText} rotate-180`}>
            {displayValue}
          </span>
        </div>

        {/* Back face */}
        <div
          className={`absolute inset-0 border-2 ${faceDownBorder}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: faceDownBg,
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-3/4 h-3/4 border ${faceDownInner}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

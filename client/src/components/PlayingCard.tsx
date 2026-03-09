import type { CardValue } from '../types/game';

interface PlayingCardProps {
  value: CardValue;
  faceUp?: boolean;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

// Individual playing card with 3D flip animation
export default function PlayingCard({
  value,
  faceUp = false,
  selected = false,
  size = 'medium',
  onClick,
  disabled = false,
}: PlayingCardProps) {
  const sizeClasses = {
    small: 'w-10 h-14 text-xs',
    medium: 'w-16 h-24 text-base',
    large: 'w-20 h-30 text-lg',
  };

  const displayValue = String(value);

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
          className={`absolute inset-0 rounded-lg border-2 flex flex-col items-center justify-center bg-white
            ${selected ? 'border-blue-600 ring-2 ring-blue-300 -translate-y-2' : 'border-gray-300'}
            ${!disabled && !selected ? 'hover:border-blue-400 hover:-translate-y-1' : ''}
            transition-all`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="absolute top-1 left-1.5 text-[10px] font-semibold text-gray-600">
            {displayValue}
          </span>
          <span className="font-bold text-gray-800">{displayValue}</span>
          <span className="absolute bottom-1 right-1.5 text-[10px] font-semibold text-gray-600 rotate-180">
            {displayValue}
          </span>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 rounded-lg border-2 border-gray-400"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          }}
        >
          <div className="w-full h-full rounded-md flex items-center justify-center">
            <div className="w-3/4 h-3/4 border border-white/30 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

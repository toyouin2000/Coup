import { cn } from '@/lib/utils';
import { CHARACTER_COLORS } from '@/lib/gameConstants';
import { Eye, EyeOff } from 'lucide-react';

const CHARACTER_SYMBOLS = {
  Duke: '👑',
  Assassin: '🗡️',
  Captain: '⚓',
  Ambassador: '🕊️',
  Contessa: '💎',
  hidden: '?',
};

export default function InfluenceCard({ card, size = 'md', selectable = false, selected = false, onClick }) {
  const { character, revealed } = card;
  const colors = CHARACTER_COLORS[revealed ? character : (character === 'hidden' ? 'hidden' : character)] || CHARACTER_COLORS.hidden;
  const isHidden = character === 'hidden';

  const sizeClasses = {
    sm: 'w-16 h-22 text-xs',
    md: 'w-24 h-32 text-sm',
    lg: 'w-32 h-44 text-base',
  };

  const symbolSize = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 select-none',
        sizeClasses[size],
        colors.bg,
        colors.border,
        revealed && 'opacity-40 grayscale',
        selectable && !revealed && 'cursor-pointer hover:scale-105 hover:shadow-lg',
        selectable && !revealed && colors.glow && `hover:shadow-lg`,
        selected && 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-transparent',
        !selectable && 'cursor-default',
      )}
    >
      {/* Glow effect when selectable */}
      {selectable && !revealed && (
        <span className={cn('absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity', colors.bg)} />
      )}

      <span className={cn('relative z-10', symbolSize[size])}>
        {isHidden ? '?' : CHARACTER_SYMBOLS[character] || '?'}
      </span>

      <span className={cn('relative z-10 font-semibold mt-1', colors.text, size === 'sm' ? 'text-[10px]' : 'text-xs')}>
        {isHidden ? 'Hidden' : character}
      </span>

      {revealed && (
        <span className="absolute top-1 right-1">
          <Eye className="w-3 h-3 text-slate-400" />
        </span>
      )}

      {selectable && !revealed && (
        <span className="absolute bottom-1 right-1 opacity-50">
          <EyeOff className="w-3 h-3 text-white" />
        </span>
      )}
    </button>
  );
}

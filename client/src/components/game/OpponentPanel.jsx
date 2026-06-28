import { cn } from '@/lib/utils';
import CoinDisplay from './CoinDisplay';
import InfluenceCard from './InfluenceCard';
import { Crown } from 'lucide-react';

export default function OpponentPanel({ player, isCurrentTurn, isTarget, onSelect, selectable }) {
  const influenceLeft = player.cards.filter((c) => !c.revealed).length;

  return (
    <button
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable || player.isEliminated}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 min-w-[100px]',
        player.isEliminated
          ? 'border-slate-700 bg-slate-900/30 opacity-40'
          : isCurrentTurn
          ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20'
          : isTarget
          ? 'border-red-400 bg-red-400/10 shadow-lg shadow-red-400/20'
          : 'border-slate-700 bg-slate-800/50',
        selectable && !player.isEliminated && 'cursor-pointer hover:border-red-400 hover:bg-red-400/10 hover:shadow-lg',
      )}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
          ▶ Turn
        </span>
      )}
      {isTarget && (
        <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">
          Target
        </span>
      )}

      {/* Name */}
      <span className={cn(
        'text-xs font-semibold truncate max-w-[88px]',
        player.isEliminated ? 'line-through text-slate-500' : 'text-slate-200',
      )}>
        {player.name}
      </span>

      {/* Cards (small) */}
      <div className="flex gap-1">
        {player.cards.map((card, i) => (
          <InfluenceCard key={i} card={card} size="sm" />
        ))}
      </div>

      {/* Coins */}
      <CoinDisplay coins={player.coins} size="sm" />

      {/* Eliminated badge */}
      {player.isEliminated && (
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Eliminated</span>
      )}
    </button>
  );
}

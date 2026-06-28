import { cn } from '@/lib/utils';

export default function CoinDisplay({ coins, size = 'md', highlight = false }) {
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5 gap-1',
    md: 'text-base px-3 py-1 gap-1.5',
    lg: 'text-xl px-4 py-2 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold font-mono border',
        sizeClasses[size],
        highlight
          ? 'bg-amber-400/20 border-amber-400 text-amber-300'
          : 'bg-slate-800 border-slate-600 text-slate-300',
      )}
    >
      <span className="text-yellow-400">🪙</span>
      <span>{coins}</span>
    </span>
  );
}

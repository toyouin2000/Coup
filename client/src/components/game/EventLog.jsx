import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollText } from 'lucide-react';

export default function EventLog({ events = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <ScrollText className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Event Log</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {events.length === 0 && (
          <p className="text-xs text-slate-600 italic px-1">No events yet.</p>
        )}
        {[...events].reverse().map((e, i) => (
          <div
            key={i}
            className={cn(
              'text-xs px-2 py-1.5 rounded-lg border',
              i === 0
                ? 'bg-slate-700/60 border-slate-600 text-slate-200'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-400',
            )}
          >
            {e.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

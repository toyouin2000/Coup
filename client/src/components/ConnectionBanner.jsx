import { useSocket } from '@/context/SocketContext';
import { WifiOff } from 'lucide-react';

export default function ConnectionBanner() {
  const { connected } = useSocket();

  if (connected) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-red-900/95 border-b border-red-700 px-4 py-2 text-sm text-red-100 backdrop-blur-sm">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>Connection lost — reconnecting…</span>
    </div>
  );
}

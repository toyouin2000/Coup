import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Check, GripVertical, Crown } from 'lucide-react';

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { lobbyState, gameState, myId, resetGame, setOnPlayerLeft } = useGame();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);

  // Sync players from lobbyState
  useEffect(() => {
    if (lobbyState) setPlayers(lobbyState.players);
  }, [lobbyState]);

  // Navigate to game when it starts
  useEffect(() => {
    if (gameState) navigate('/game');
  }, [gameState, navigate]);

  // Redirect to lobby if no room
  useEffect(() => {
    if (!lobbyState) navigate('/');
  }, []);

  // Register player-left handler for toasts
  useEffect(() => {
    setOnPlayerLeft((leftId) => {
      const name = players.find((p) => p.id === leftId)?.name;
      if (name) toast({ message: `${name} left the room.`, type: 'info' });
    });
    return () => setOnPlayerLeft(null);
  }, [players, setOnPlayerLeft, toast]);

  if (!lobbyState) return null;

  const isHost = lobbyState.hostId === myId;
  const me = players.find((p) => p.id === myId);
  const allReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && players.length >= 2 && allReady;

  function copyCode() {
    navigator.clipboard.writeText(lobbyState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ message: 'Room code copied!', type: 'success', duration: 1500 });
  }

  function toggleReady() {
    socket.emit('room:ready', { ready: !me?.ready });
  }

  function handleStart() {
    setError('');
    socket.emit('room:start', (res) => {
      if (res?.error) {
        setError(res.error);
        toast({ message: res.error, type: 'error' });
      }
    });
  }

  function handleLeave() {
    resetGame();
    navigate('/');
  }

  // ── Drag to reorder (host only) ──────────────────────────────────────────────
  function onDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...players];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setDragIdx(idx);
    setPlayers(next);
  }

  function onDragEnd() {
    setDragIdx(null);
    if (!isHost) return;
    socket.emit('room:reorder', { newOrder: players.map((p) => p.id) });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Waiting Room</CardTitle>
            {/* Room code + copy */}
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] transition-colors rounded-lg px-3 py-1.5 text-sm font-mono font-bold tracking-widest"
            >
              {lobbyState.code}
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-400" />
                : <Copy className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
            </button>
          </div>
          <CardDescription>
            {isHost
              ? 'Share the code. Drag to set turn order. Start when everyone is ready.'
              : 'Waiting for the host to start the game.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Player list */}
          <div className="space-y-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                draggable={isHost}
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all duration-150 ${
                  p.id === myId
                    ? 'border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.08)]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]'
                } ${isHost ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {isHost && <GripVertical className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />}
                <span className="text-xs text-[hsl(var(--muted-foreground))] w-4 shrink-0">{idx + 1}</span>
                <span className="flex-1 font-medium text-sm">
                  {p.name}{p.id === myId ? ' (you)' : ''}
                </span>
                {p.isHost && <Crown className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />}
                <Badge variant={p.isHost ? 'default' : p.ready ? 'success' : 'secondary'}>
                  {p.isHost ? 'Host' : p.ready ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            ))}
          </div>

          {players.length < 2 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              Need at least 2 players to start.
            </p>
          )}

          {error && <p className="text-[hsl(var(--destructive))] text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {!isHost && (
              <Button
                className="flex-1"
                variant={me?.ready ? 'secondary' : 'default'}
                onClick={toggleReady}
              >
                {me?.ready ? 'Cancel Ready' : 'Ready'}
              </Button>
            )}
            {isHost && (
              <Button className="flex-1" onClick={handleStart} disabled={!canStart}>
                {canStart ? 'Start Game' : 'Waiting for players…'}
              </Button>
            )}
            <Button variant="outline" onClick={handleLeave} className="shrink-0">
              Leave
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

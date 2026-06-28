import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords } from 'lucide-react';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { setRoomCode } = useGame();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // 'create' | 'join'

  function handleCreate() {
    if (!playerName.trim()) {
      setError('Enter your name first.');
      toast({ message: 'Enter your name first.', type: 'error' });
      return;
    }
    setLoading(true);
    setError('');
    socket.emit('room:create', { playerName: playerName.trim() }, (res) => {
      setLoading(false);
      if (res.error) {
        setError(res.error);
        toast({ message: res.error, type: 'error' });
        return;
      }
      setRoomCode(res.code);
      navigate('/waiting');
    });
  }

  function handleJoin() {
    if (!playerName.trim()) {
      toast({ message: 'Enter your name first.', type: 'error' });
      return setError('Enter your name first.');
    }
    if (!joinCode.trim()) {
      toast({ message: 'Enter a room code.', type: 'error' });
      return setError('Enter a room code.');
    }
    setLoading(true);
    setError('');
    socket.emit('room:join', { playerName: playerName.trim(), code: joinCode.trim().toUpperCase() }, (res) => {
      setLoading(false);
      if (res.error) {
        setError(res.error);
        toast({ message: res.error, type: 'error' });
        return;
      }
      setRoomCode(res.code);
      navigate('/waiting');
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(var(--background))]">
      {/* Title */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Swords className="w-10 h-10 text-[hsl(var(--primary))]" />
          <h1 className="text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">COUP</h1>
          <Swords className="w-10 h-10 text-[hsl(var(--primary))] scale-x-[-1]" />
        </div>
        <p className="text-[hsl(var(--muted-foreground))] text-sm tracking-widest uppercase">
          Bluff. Challenge. Survive.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Welcome</CardTitle>
          <CardDescription>Enter your name to get started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="e.g. Duke Wellington"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              maxLength={20}
              onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'join') handleJoin(); }}
            />
          </div>

          {/* Mode selection */}
          {!mode && (
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => setMode('create')} disabled={!connected}>
                Create Room
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setMode('join')} disabled={!connected}>
                Join Room
              </Button>
            </div>
          )}

          {/* Create */}
          {mode === 'create' && (
            <div className="space-y-3 pt-1">
              <Button className="w-full" onClick={handleCreate} disabled={loading || !connected}>
                {loading ? 'Creating…' : 'Create Room'}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => { setMode(null); setError(''); }}>
                ← Back
              </Button>
            </div>
          )}

          {/* Join */}
          {mode === 'join' && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="code">Room code</Label>
                <Input
                  id="code"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={6}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                />
              </div>
              <Button className="w-full" onClick={handleJoin} disabled={loading || !connected}>
                {loading ? 'Joining…' : 'Join Room'}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => { setMode(null); setError(''); setJoinCode(''); }}>
                ← Back
              </Button>
            </div>
          )}

          {/* Inline error */}
          {error && <p className="text-[hsl(var(--destructive))] text-sm">{error}</p>}

          {/* Connection status */}
          {!connected && (
            <p className="text-[hsl(var(--muted-foreground))] text-xs text-center">
              Connecting to server…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

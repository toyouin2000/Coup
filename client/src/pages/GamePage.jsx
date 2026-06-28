import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { useToast } from '@/context/ToastContext';
import OpponentPanel from '@/components/game/OpponentPanel';
import InfluenceCard from '@/components/game/InfluenceCard';
import CoinDisplay from '@/components/game/CoinDisplay';
import ActionPanel from '@/components/game/ActionPanel';
import EventLog from '@/components/game/EventLog';
import { Swords } from 'lucide-react';

export default function GamePage() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { gameState, myId, resetGame, setOnPlayerLeft } = useGame();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const prevLogRef = useRef([]);

  // Redirect if no game
  useEffect(() => {
    if (!gameState) navigate('/');
  }, []);

  // Toast on new event log entries
  useEffect(() => {
    if (!gameState?.eventLog) return;
    const prev = prevLogRef.current;
    const newEntries = gameState.eventLog.filter(
      (e) => !prev.some((p) => p.timestamp === e.timestamp)
    );
    // Only toast the most recent new entry (avoid spam)
    if (newEntries.length > 0 && prev.length > 0) {
      toast({ message: newEntries[0].message, type: 'info', duration: 3000 });
    }
    prevLogRef.current = gameState.eventLog;
  }, [gameState?.eventLog]);

  // Toast when a player is eliminated
  useEffect(() => {
    if (!gameState) return;
    const eliminated = gameState.players.filter((p) => p.isEliminated);
    eliminated.forEach((p) => {
      if (p.id === myId) {
        toast({ message: 'You have been eliminated!', type: 'error', duration: 5000 });
      }
    });
  }, [gameState?.players?.map(p => p.isEliminated).join(',')]);

  // Toast when game ends
  useEffect(() => {
    if (gameState?.phase === 'game_over' && gameState?.winner) {
      const isWinner = gameState.winner.id === myId;
      toast({
        message: isWinner ? '🎉 You win!' : `${gameState.winner.name} wins the game!`,
        type: isWinner ? 'success' : 'info',
        duration: 6000,
      });
    }
  }, [gameState?.phase]);

  // Register player-left handler
  useEffect(() => {
    setOnPlayerLeft((leftId) => {
      const name = gameState?.players.find((p) => p.id === leftId)?.name;
      if (name) toast({ message: `${name} disconnected.`, type: 'error' });
    });
    return () => setOnPlayerLeft(null);
  }, [gameState, setOnPlayerLeft, toast]);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === myId);
  const opponents = gameState.players.filter((p) => p.id !== myId);
  const currentPlayer = gameState.players[gameState.turnIndex];
  const ca = gameState.currentAction;

  function emit(event, payload) {
    setError('');
    socket.emit(event, payload, (res) => {
      if (res?.error) {
        setError(res.error);
        toast({ message: res.error, type: 'error' });
      }
    });
  }

  const onAction = (action, targetId) => emit('game:action', { action, targetId });
  const onChallenge = () => emit('game:challenge');
  const onBlock = (blockCharacter) => emit('game:block', { blockCharacter });
  const onPass = () => emit('game:pass');
  const onChallengeBlock = () => emit('game:challengeBlock');
  const onLoseInfluence = (cardIndex) => emit('game:loseInfluence', { cardIndex });
  const onExchange = (keptCardIndices) => emit('game:exchange', { keptCardIndices });

  const onLeave = () => {
    resetGame();
    navigate('/');
  };

  const isMyTurn = currentPlayer?.id === myId;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col p-3 gap-3 max-w-4xl mx-auto pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-[hsl(var(--primary))]" />
          <span className="font-bold text-[hsl(var(--primary))] tracking-wider text-sm">COUP</span>
        </div>
        <div className="flex items-center gap-2">
          {isMyTurn && gameState.phase === 'action' && (
            <span className="text-xs font-semibold text-amber-400 animate-pulse">
              ● Your turn
            </span>
          )}
          <span className="text-xs text-slate-600 font-mono hidden sm:block">
            {gameState.phase}
          </span>
        </div>
      </div>

      {/* ── Opponents ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {opponents.length === 0 && (
          <p className="text-xs text-slate-600 italic">No other players.</p>
        )}
        {opponents.map((p) => (
          <OpponentPanel
            key={p.id}
            player={p}
            isCurrentTurn={currentPlayer?.id === p.id}
            isTarget={ca?.targetId === p.id}
          />
        ))}
      </div>

      {/* ── Action Panel ───────────────────────────────────────────────────── */}
      <div>
        <ActionPanel
          gameState={gameState}
          myId={myId}
          onAction={onAction}
          onChallenge={onChallenge}
          onBlock={onBlock}
          onPass={onPass}
          onChallengeBlock={onChallengeBlock}
          onLoseInfluence={onLoseInfluence}
          onExchange={onExchange}
          onLeave={onLeave}
          error={error}
        />
      </div>

      {/* ── Event Log ──────────────────────────────────────────────────────── */}
      <div className="h-32 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 overflow-hidden">
        <EventLog events={gameState.eventLog} />
      </div>

      {/* ── My Hand ────────────────────────────────────────────────────────── */}
      {me && (
        <div className={`rounded-xl border p-4 transition-colors duration-300 ${
          isMyTurn
            ? 'border-amber-500/50 bg-amber-400/5 shadow-lg shadow-amber-400/10'
            : 'border-slate-700 bg-slate-900/80'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Your Hand</p>
              <p className="text-sm font-bold text-white">{me.name}</p>
              {me.isEliminated && (
                <p className="text-xs text-red-400 font-semibold mt-0.5">Eliminated</p>
              )}
            </div>
            <CoinDisplay coins={me.coins} size="md" highlight={isMyTurn} />
          </div>
          <div className="flex gap-3 flex-wrap">
            {me.cards.map((card, i) => (
              <InfluenceCard key={i} card={card} size="lg" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

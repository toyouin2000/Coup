import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTIONS, ACTION_DEFS, PHASES, BLOCK_OPTIONS } from '@/lib/gameConstants';
import InfluenceCard from './InfluenceCard';

// ── Phase: ACTION — current player picks an action ────────────────────────────
function ActionPicker({ gameState, myId, onAction, error }) {
  const [targetId, setTargetId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const me = gameState.players.find((p) => p.id === myId);
  const opponents = gameState.players.filter((p) => p.id !== myId && !p.isEliminated);
  const mustCoup = me?.coins >= 10;

  function selectAction(action) {
    const def = ACTION_DEFS[action];
    if (def.targeted) {
      setPendingAction(action);
      setTargetId(null);
    } else {
      onAction(action, null);
    }
  }

  function confirmTargeted() {
    if (!targetId) return;
    onAction(pendingAction, targetId);
    setPendingAction(null);
    setTargetId(null);
  }

  if (pendingAction) {
    const def = ACTION_DEFS[pendingAction];
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{def.label}</span> — choose a target:
        </p>
        <div className="flex flex-wrap gap-2">
          {opponents.map((p) => (
            <button
              key={p.id}
              onClick={() => setTargetId(p.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                targetId === p.id
                  ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                  : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-400',
              )}
            >
              {p.name} ({p.coins}🪙)
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={confirmTargeted} disabled={!targetId}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mustCoup && (
        <p className="text-xs text-amber-400 font-semibold">
          ⚠ You have 10+ coins — you must Coup.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(ACTION_DEFS).map(([action, def]) => {
          const canAfford = me?.coins >= def.cost;
          const disabled = mustCoup ? action !== ACTIONS.COUP : !canAfford;
          return (
            <button
              key={action}
              disabled={disabled}
              onClick={() => selectAction(action)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                disabled
                  ? 'border-slate-700 bg-slate-800/30 opacity-40 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-800/60 hover:border-amber-400/60 hover:bg-amber-400/5 cursor-pointer',
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-semibold text-white">{def.label}</span>
                {def.cost > 0 && (
                  <span className="text-xs text-yellow-400 font-mono">-{def.cost}🪙</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 leading-tight">{def.description}</span>
              {def.character && (
                <Badge variant="secondary" className="text-[10px] mt-0.5 py-0 px-1.5">{def.character}</Badge>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Phase: BLOCK_CHALLENGE — non-actor players can challenge or block ──────────
function BlockChallengePanel({ gameState, myId, onChallenge, onBlock, onPass, error }) {
  const ca = gameState.currentAction;
  const def = ACTION_DEFS[ca?.action];
  const isActor = ca?.actorId === myId;
  const actor = gameState.players.find((p) => p.id === ca?.actorId);
  const blockOptions = BLOCK_OPTIONS[ca?.action] || [];

  if (isActor) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-300">
          You declared <span className="font-semibold text-white">{def?.label}</span>.
          Waiting for others to challenge or block…
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onPass}>
            Everyone Passed — Resolve
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-white">{actor?.name}</span> declared{' '}
        <span className="font-semibold text-white">{def?.label}</span>
        {def?.character && ` (claims ${def.character})`}.
      </p>
      <div className="flex flex-wrap gap-2">
        {def?.challengeable && (
          <Button size="sm" variant="destructive" onClick={onChallenge}>
            Challenge
          </Button>
        )}
        {blockOptions.map((opt) => (
          <Button key={opt.character} size="sm" variant="secondary" onClick={() => onBlock(opt.character)}>
            {opt.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onPass}>
          Pass
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Phase: BLOCK_CHALLENGE_RESPONSE — actor can challenge the block ────────────
function BlockResponsePanel({ gameState, myId, onChallengeBlock, onPass, error }) {
  const ca = gameState.currentAction;
  const isActor = ca?.actorId === myId;
  const blocker = gameState.players.find((p) => p.id === ca?.blockerId);

  if (!isActor) {
    return (
      <p className="text-sm text-slate-300">
        Waiting for <span className="font-semibold text-white">{gameState.players.find(p=>p.id===ca?.actorId)?.name}</span> to respond to the block…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-white">{blocker?.name}</span> claims{' '}
        <span className="font-semibold text-white">{ca?.blockCharacter}</span> to block your action.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={onChallengeBlock}>
          Challenge Block
        </Button>
        <Button size="sm" variant="ghost" onClick={onPass}>
          Accept Block
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Phase: LOSE_INFLUENCE — a player must reveal a card ───────────────────────
function LoseInfluencePanel({ gameState, myId, onLoseInfluence, error }) {
  const ca = gameState.currentAction;
  const mustLose = ca?.pendingLoseInfluence === myId;
  const loser = gameState.players.find((p) => p.id === ca?.pendingLoseInfluence);
  const me = gameState.players.find((p) => p.id === myId);

  if (!mustLose) {
    return (
      <p className="text-sm text-slate-300">
        Waiting for <span className="font-semibold text-white">{loser?.name}</span> to reveal an influence…
      </p>
    );
  }

  const aliveCards = me?.cards
    .map((c, i) => ({ ...c, index: i }))
    .filter((c) => !c.revealed) || [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-300 font-semibold">
        You must reveal and lose one influence card.
      </p>
      <div className="flex gap-3">
        {aliveCards.map((card) => (
          <InfluenceCard
            key={card.index}
            card={card}
            size="md"
            selectable
            onClick={() => onLoseInfluence(card.index)}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Phase: EXCHANGE — Ambassador card pick ────────────────────────────────────
function ExchangePanel({ gameState, myId, onExchange, error }) {
  const ca = gameState.currentAction;
  const isActor = ca?.actorId === myId;
  const me = gameState.players.find((p) => p.id === myId);

  const [selected, setSelected] = useState([]);

  if (!isActor) {
    return (
      <p className="text-sm text-slate-300">
        Waiting for <span className="font-semibold text-white">{gameState.players.find(p=>p.id===ca?.actorId)?.name}</span> to exchange cards…
      </p>
    );
  }

  const aliveCards = me?.cards.filter((c) => !c.revealed) || [];
  const drawnCards = ca?.drawnCards || [];
  const allCards = [...aliveCards, ...drawnCards];
  const influenceCount = aliveCards.length;

  function toggleSelect(i) {
    setSelected((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : prev.length < influenceCount
        ? [...prev, i]
        : prev,
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Choose <span className="font-semibold text-white">{influenceCount}</span> card(s) to keep:
      </p>
      <div className="flex flex-wrap gap-3">
        {allCards.map((card, i) => (
          <InfluenceCard
            key={i}
            card={card}
            size="md"
            selectable
            selected={selected.includes(i)}
            onClick={() => toggleSelect(i)}
          />
        ))}
      </div>
      <Button
        size="sm"
        disabled={selected.length !== influenceCount}
        onClick={() => onExchange(selected)}
      >
        Confirm Exchange ({selected.length}/{influenceCount})
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Phase: GAME_OVER ──────────────────────────────────────────────────────────
function GameOverPanel({ gameState, myId, onLeave }) {
  const winner = gameState.winner;
  const iWon = winner?.id === myId;
  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl font-bold">
        {iWon ? '🎉 You Win!' : `${winner?.name} wins!`}
      </p>
      <p className="text-slate-400 text-sm">The game is over.</p>
      <Button onClick={onLeave}>Back to Lobby</Button>
    </div>
  );
}

// ── Main ActionPanel ───────────────────────────────────────────────────────────
export default function ActionPanel({ gameState, myId, onAction, onChallenge, onBlock, onPass, onChallengeBlock, onLoseInfluence, onExchange, onLeave, error }) {
  const phase = gameState?.phase;
  const currentPlayer = gameState?.players[gameState?.turnIndex];
  const isMyTurn = currentPlayer?.id === myId;

  const phaseLabel = {
    action: isMyTurn ? 'Your Turn' : `${currentPlayer?.name}'s Turn`,
    block_challenge: 'Challenge or Block?',
    block_challenge_response: 'Block Declared',
    lose_influence: 'Lose Influence',
    exchange: 'Exchange Cards',
    game_over: 'Game Over',
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
      {/* Phase header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
        <span className={cn(
          'text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
          phase === PHASES.GAME_OVER ? 'bg-amber-400/20 text-amber-400' :
          isMyTurn || phase === PHASES.LOSE_INFLUENCE || phase === PHASES.EXCHANGE
            ? 'bg-amber-400/20 text-amber-400'
            : 'bg-slate-700 text-slate-400',
        )}>
          {phaseLabel[phase] || phase}
        </span>
      </div>

      {/* Phase-specific controls */}
      {phase === PHASES.ACTION && isMyTurn && (
        <ActionPicker gameState={gameState} myId={myId} onAction={onAction} error={error} />
      )}
      {phase === PHASES.ACTION && !isMyTurn && (
        <p className="text-sm text-slate-400">Waiting for {currentPlayer?.name} to take their turn…</p>
      )}
      {phase === PHASES.BLOCK_CHALLENGE && (
        <BlockChallengePanel gameState={gameState} myId={myId} onChallenge={onChallenge} onBlock={onBlock} onPass={onPass} error={error} />
      )}
      {phase === PHASES.BLOCK_CHALLENGE_RESPONSE && (
        <BlockResponsePanel gameState={gameState} myId={myId} onChallengeBlock={onChallengeBlock} onPass={onPass} error={error} />
      )}
      {phase === PHASES.LOSE_INFLUENCE && (
        <LoseInfluencePanel gameState={gameState} myId={myId} onLoseInfluence={onLoseInfluence} error={error} />
      )}
      {phase === PHASES.EXCHANGE && (
        <ExchangePanel gameState={gameState} myId={myId} onExchange={onExchange} error={error} />
      )}
      {phase === PHASES.GAME_OVER && (
        <GameOverPanel gameState={gameState} myId={myId} onLeave={onLeave} />
      )}
    </div>
  );
}



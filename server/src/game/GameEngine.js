import {
  CHARACTERS,
  ACTIONS,
  ACTION_DEFS,
  PHASES,
  DECK_COMPOSITION,
  STARTING_COINS,
  MUST_COUP_AT,
} from './constants.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── State creation ────────────────────────────────────────────────────────────

export function createGameState(players /* [{id, name}] ordered by turn */) {
  const deck = shuffle([...DECK_COMPOSITION]);

  const gamePlayers = players.map((p) => {
    const cards = [deck.pop(), deck.pop()];
    return {
      id: p.id,
      name: p.name,
      coins: STARTING_COINS,
      // Each card: { character, revealed: false }
      cards: cards.map((c) => ({ character: c, revealed: false })),
      isEliminated: false,
    };
  });

  return {
    players: gamePlayers,
    deck,                    // Remaining court deck
    turnIndex: 0,            // Index into players array
    phase: PHASES.ACTION,
    currentAction: null,     // Details of action in progress
    pendingBlock: null,      // Details of a block attempt
    eventLog: [],
    winner: null,
  };
}

// ─── Selectors ─────────────────────────────────────────────────────────────────

export function getPlayer(state, id) {
  return state.players.find((p) => p.id === id);
}

export function getCurrentPlayer(state) {
  return state.players[state.turnIndex];
}

export function getActivePlayers(state) {
  return state.players.filter((p) => !p.isEliminated);
}

export function getInfluenceCount(player) {
  return player.cards.filter((c) => !c.revealed).length;
}

// Build what each socket is allowed to see (hide other players' unrevealed cards)
export function buildPlayerView(state, socketId) {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id === socketId) return p; // Full info for yourself
      return {
        ...p,
        cards: p.cards.map((c) =>
          c.revealed ? c : { character: 'hidden', revealed: false }
        ),
      };
    }),
    deck: [], // Never send the deck to clients
  };
}

// ─── Log helper ────────────────────────────────────────────────────────────────

function log(state, message) {
  state.eventLog.unshift({ message, timestamp: Date.now() });
  if (state.eventLog.length > 20) state.eventLog.pop();
}

// ─── Turn advancement ──────────────────────────────────────────────────────────

function nextTurn(state) {
  const active = getActivePlayers(state);
  if (active.length <= 1) {
    state.phase = PHASES.GAME_OVER;
    state.winner = active[0] || null;
    return;
  }

  let next = (state.turnIndex + 1) % state.players.length;
  while (state.players[next].isEliminated) {
    next = (next + 1) % state.players.length;
  }
  state.turnIndex = next;
  state.phase = PHASES.ACTION;
  state.currentAction = null;
  state.pendingBlock = null;
}

// ─── Elimination ───────────────────────────────────────────────────────────────

function eliminatePlayer(state, playerId) {
  const player = getPlayer(state, playerId);
  player.isEliminated = true;
  // Reveal all remaining cards
  player.cards.forEach((c) => (c.revealed = true));
  log(state, `${player.name} has been eliminated!`);
}

// ─── Challenge resolution ──────────────────────────────────────────────────────
// Returns { success: true } if claim was valid (challenger loses), or { success: false } if bluff caught

function resolveChallenge(state, claimerId, claimedCharacter) {
  const claimer = getPlayer(state, claimerId);
  const hasCard = claimer.cards.some(
    (c) => !c.revealed && c.character === claimedCharacter
  );

  if (hasCard) {
    // Claimer wins: replace the revealed card with a new one from the deck
    const cardIdx = claimer.cards.findIndex(
      (c) => !c.revealed && c.character === claimedCharacter
    );
    const oldCard = claimer.cards[cardIdx].character;
    state.deck.push(oldCard);
    state.deck = shuffle(state.deck);
    claimer.cards[cardIdx] = { character: state.deck.pop(), revealed: false };

    return { challengeSucceeded: false }; // Claimer's claim was valid
  } else {
    // Claimer was bluffing
    return { challengeSucceeded: true };
  }
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export function performAction(state, actorId, action, targetId = null) {
  const actor = getPlayer(state, actorId);
  const def = ACTION_DEFS[action];

  if (!actor || actor.isEliminated) return { error: 'Invalid actor.' };
  if (getCurrentPlayer(state).id !== actorId) return { error: 'Not your turn.' };
  if (state.phase !== PHASES.ACTION) return { error: 'Wrong phase.' };
  if (actor.coins < def.cost) return { error: 'Not enough coins.' };
  if (actor.coins >= MUST_COUP_AT && action !== ACTIONS.COUP)
    return { error: 'You must Coup when you have 10 or more coins.' };
  if (def.targeted && !targetId) return { error: 'This action requires a target.' };
  if (def.targeted) {
    const target = getPlayer(state, targetId);
    if (!target || target.isEliminated) return { error: 'Invalid target.' };
  }

  // Deduct cost upfront (refunded if challenged successfully)
  actor.coins -= def.cost;

  state.currentAction = {
    action,
    actorId,
    targetId: targetId || null,
    claimedCharacter: def.requires,
    challenged: false,
    blocked: false,
    challengerId: null,
    blockerId: null,
    blockCharacter: null,
    blockChallenged: false,
    blockChallengerId: null,
  };

  log(state, `${actor.name} declares ${action}${targetId ? ` on ${getPlayer(state, targetId)?.name}` : ''}.`);

  // Income and Coup resolve immediately (not blockable/challengeable)
  if (action === ACTIONS.INCOME) {
    actor.coins += 1;
    log(state, `${actor.name} takes 1 coin (Income).`);
    nextTurn(state);
    return { ok: true };
  }

  if (action === ACTIONS.COUP) {
    state.phase = PHASES.LOSE_INFLUENCE;
    state.currentAction.pendingLoseInfluence = targetId;
    log(state, `${actor.name} launches a Coup against ${getPlayer(state, targetId)?.name}!`);
    return { ok: true };
  }

  // All other actions enter block/challenge window
  state.phase = PHASES.BLOCK_CHALLENGE;
  return { ok: true };
}

// ─── Challenge an action ────────────────────────────────────────────────────────

export function challengeAction(state, challengerId) {
  if (state.phase !== PHASES.BLOCK_CHALLENGE) return { error: 'Cannot challenge now.' };
  const ca = state.currentAction;
  if (!ca || !ca.claimedCharacter) return { error: 'Action is not challengeable.' };
  if (challengerId === ca.actorId) return { error: 'Cannot challenge your own action.' };

  const challenger = getPlayer(state, challengerId);
  ca.challenged = true;
  ca.challengerId = challengerId;

  log(state, `${challenger.name} challenges ${getPlayer(state, ca.actorId)?.name}'s claim of ${ca.claimedCharacter}!`);

  const { challengeSucceeded } = resolveChallenge(state, ca.actorId, ca.claimedCharacter);

  if (challengeSucceeded) {
    // Actor was bluffing — actor loses an influence; refund cost
    const actor = getPlayer(state, ca.actorId);
    actor.coins += ACTION_DEFS[ca.action].cost; // Refund
    log(state, `${actor.name} was bluffing! They must lose an influence.`);
    state.phase = PHASES.LOSE_INFLUENCE;
    state.currentAction.pendingLoseInfluence = ca.actorId;
  } else {
    // Claim was valid — challenger loses an influence
    log(state, `${challenger.name}'s challenge failed! They must lose an influence.`);
    state.phase = PHASES.LOSE_INFLUENCE;
    state.currentAction.pendingLoseInfluence = challengerId;
    // After challenger loses influence, action still resolves — flag it
    state.currentAction.resolveAfterLoss = true;
  }

  return { ok: true };
}

// ─── Block an action ───────────────────────────────────────────────────────────

export function blockAction(state, blockerId, blockCharacter) {
  if (state.phase !== PHASES.BLOCK_CHALLENGE) return { error: 'Cannot block now.' };
  const ca = state.currentAction;
  if (!ca) return { error: 'No action to block.' };

  const def = ACTION_DEFS[ca.action];
  if (!def.blockableBy.includes(blockCharacter))
    return { error: `${blockCharacter} cannot block ${ca.action}.` };

  const blocker = getPlayer(state, blockerId);
  ca.blocked = true;
  ca.blockerId = blockerId;
  ca.blockCharacter = blockCharacter;

  log(state, `${blocker.name} claims ${blockCharacter} to block ${ca.action}.`);
  state.phase = PHASES.BLOCK_CHALLENGE_RESPONSE;
  return { ok: true };
}

// ─── Pass (allow action / allow block) ────────────────────────────────────────

export function passAction(state, playerId) {
  // Passing during BLOCK_CHALLENGE means the action resolves
  if (state.phase === PHASES.BLOCK_CHALLENGE) {
    return resolveAction(state);
  }
  // Passing during BLOCK_CHALLENGE_RESPONSE means block succeeds
  if (state.phase === PHASES.BLOCK_CHALLENGE_RESPONSE) {
    const ca = state.currentAction;
    const actor = getPlayer(state, ca.actorId);
    // Refund cost — action was blocked
    actor.coins += ACTION_DEFS[ca.action].cost;
    log(state, `${getPlayer(state, ca.actorId)?.name}'s ${ca.action} was blocked.`);
    nextTurn(state);
    return { ok: true };
  }
  return { error: 'Cannot pass in current phase.' };
}

// ─── Challenge a block ─────────────────────────────────────────────────────────

export function challengeBlock(state, challengerId) {
  if (state.phase !== PHASES.BLOCK_CHALLENGE_RESPONSE) return { error: 'Cannot challenge block now.' };
  const ca = state.currentAction;

  const challenger = getPlayer(state, challengerId);
  ca.blockChallenged = true;
  ca.blockChallengerId = challengerId;

  log(state, `${challenger.name} challenges ${getPlayer(state, ca.blockerId)?.name}'s claim of ${ca.blockCharacter}!`);

  const { challengeSucceeded } = resolveChallenge(state, ca.blockerId, ca.blockCharacter);

  if (challengeSucceeded) {
    // Blocker was bluffing — block fails, original action resolves
    log(state, `${getPlayer(state, ca.blockerId)?.name} was bluffing! Blocker loses an influence, then action resolves.`);
    ca.blockFailed = true;
    state.phase = PHASES.LOSE_INFLUENCE;
    state.currentAction.pendingLoseInfluence = ca.blockerId;
    state.currentAction.resolveAfterLoss = true;
  } else {
    // Block was valid — challenger loses an influence; action is blocked
    log(state, `${challenger.name}'s challenge failed! The block stands.`);
    const actor = getPlayer(state, ca.actorId);
    actor.coins += ACTION_DEFS[ca.action].cost; // Refund
    state.phase = PHASES.LOSE_INFLUENCE;
    state.currentAction.pendingLoseInfluence = challengerId;
    state.currentAction.resolveAfterLoss = false;
  }

  return { ok: true };
}

// ─── Lose influence (player chooses which card to reveal) ──────────────────────

export function loseInfluence(state, playerId, cardIndex) {
  if (state.phase !== PHASES.LOSE_INFLUENCE) return { error: 'Not in lose-influence phase.' };
  const ca = state.currentAction;
  if (ca.pendingLoseInfluence !== playerId) return { error: 'Not your turn to lose influence.' };

  const player = getPlayer(state, playerId);
  const card = player.cards[cardIndex];
  if (!card || card.revealed) return { error: 'Invalid card selection.' };

  card.revealed = true;
  log(state, `${player.name} reveals and loses ${card.character}.`);

  // Check elimination
  if (getInfluenceCount(player) === 0) {
    eliminatePlayer(state, playerId);
  }

  // Check win condition
  const active = getActivePlayers(state);
  if (active.length <= 1) {
    state.phase = PHASES.GAME_OVER;
    state.winner = active[0] || null;
    log(state, `${state.winner?.name} wins the game!`);
    return { ok: true };
  }

  // After influence loss, should the action still resolve?
  if (ca.resolveAfterLoss) {
    ca.resolveAfterLoss = false;
    return resolveAction(state);
  }

  nextTurn(state);
  return { ok: true };
}

// ─── Exchange (Ambassador) ─────────────────────────────────────────────────────

export function performExchange(state, playerId, keptCardIndices) {
  if (state.phase !== PHASES.EXCHANGE) return { error: 'Not in exchange phase.' };
  const ca = state.currentAction;
  if (ca.actorId !== playerId) return { error: 'Not your exchange.' };

  const player = getPlayer(state, playerId);
  const drawnCards = ca.drawnCards; // Set during resolveAction
  const allCards = [...player.cards.filter((c) => !c.revealed), ...drawnCards];

  const influenceCount = getInfluenceCount(player);
  if (keptCardIndices.length !== influenceCount) {
    return { error: `Must keep exactly ${influenceCount} card(s).` };
  }

  const kept = keptCardIndices.map((i) => allCards[i]);
  const returned = allCards.filter((_, i) => !keptCardIndices.includes(i));

  // Update player cards (keep revealed cards as-is)
  const revealedCards = player.cards.filter((c) => c.revealed);
  player.cards = [
    ...revealedCards,
    ...kept.map((c) => ({ character: c.character, revealed: false })),
  ];

  // Return unused cards to deck
  returned.forEach((c) => state.deck.push(c.character));
  state.deck = shuffle(state.deck);

  log(state, `${player.name} completes their exchange.`);
  nextTurn(state);
  return { ok: true };
}

// ─── Resolve action (after no challenge / challenge failed) ────────────────────

function resolveAction(state) {
  const ca = state.currentAction;
  const actor = getPlayer(state, ca.actorId);

  switch (ca.action) {
    case ACTIONS.FOREIGN_AID:
      actor.coins += 2;
      log(state, `${actor.name} takes 2 coins (Foreign Aid).`);
      nextTurn(state);
      break;

    case ACTIONS.TAX:
      actor.coins += 3;
      log(state, `${actor.name} takes 3 coins (Tax / Duke).`);
      nextTurn(state);
      break;

    case ACTIONS.STEAL: {
      const target = getPlayer(state, ca.targetId);
      const stolen = Math.min(2, target.coins);
      target.coins -= stolen;
      actor.coins += stolen;
      log(state, `${actor.name} steals ${stolen} coin(s) from ${target.name}.`);
      nextTurn(state);
      break;
    }

    case ACTIONS.ASSASSINATE:
      log(state, `${actor.name}'s assassination succeeds. ${getPlayer(state, ca.targetId)?.name} must lose an influence.`);
      state.phase = PHASES.LOSE_INFLUENCE;
      state.currentAction.pendingLoseInfluence = ca.targetId;
      state.currentAction.resolveAfterLoss = false;
      break;

    case ACTIONS.EXCHANGE: {
      // Draw 2 cards from the deck
      const drawn = [
        { character: state.deck.pop(), revealed: false },
        { character: state.deck.pop(), revealed: false },
      ];
      state.currentAction.drawnCards = drawn;
      state.phase = PHASES.EXCHANGE;
      log(state, `${actor.name} draws 2 cards for exchange.`);
      break;
    }

    default:
      nextTurn(state);
  }

  return { ok: true };
}

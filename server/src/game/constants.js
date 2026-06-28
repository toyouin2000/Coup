// ─── Characters ────────────────────────────────────────────────────────────────
export const CHARACTERS = {
  DUKE: 'Duke',
  ASSASSIN: 'Assassin',
  CAPTAIN: 'Captain',
  AMBASSADOR: 'Ambassador',
  CONTESSA: 'Contessa',
};

// ─── Actions ───────────────────────────────────────────────────────────────────
export const ACTIONS = {
  INCOME: 'Income',
  FOREIGN_AID: 'ForeignAid',
  COUP: 'Coup',
  TAX: 'Tax',           // Duke
  ASSASSINATE: 'Assassinate', // Assassin
  STEAL: 'Steal',       // Captain
  EXCHANGE: 'Exchange', // Ambassador
};

// ─── Action definitions ────────────────────────────────────────────────────────
// cost: coins required
// requires: character card needed (null = general action)
// targeted: does it need a target player?
// blockableBy: which characters can block this action
// challengeable: can opponents challenge the claim?
export const ACTION_DEFS = {
  [ACTIONS.INCOME]: {
    cost: 0,
    requires: null,
    targeted: false,
    blockableBy: [],
    challengeable: false,
    description: 'Take 1 coin from the treasury.',
  },
  [ACTIONS.FOREIGN_AID]: {
    cost: 0,
    requires: null,
    targeted: false,
    blockableBy: [CHARACTERS.DUKE],
    challengeable: false,
    description: 'Take 2 coins from the treasury.',
  },
  [ACTIONS.COUP]: {
    cost: 7,
    requires: null,
    targeted: true,
    blockableBy: [],
    challengeable: false,
    description: 'Pay 7 coins. Force a player to lose an influence.',
  },
  [ACTIONS.TAX]: {
    cost: 0,
    requires: CHARACTERS.DUKE,
    targeted: false,
    blockableBy: [],
    challengeable: true,
    description: 'Claim Duke. Take 3 coins from the treasury.',
  },
  [ACTIONS.ASSASSINATE]: {
    cost: 3,
    requires: CHARACTERS.ASSASSIN,
    targeted: true,
    blockableBy: [CHARACTERS.CONTESSA],
    challengeable: true,
    description: 'Pay 3 coins. Claim Assassin. Force a player to lose an influence.',
  },
  [ACTIONS.STEAL]: {
    cost: 0,
    requires: CHARACTERS.CAPTAIN,
    targeted: true,
    blockableBy: [CHARACTERS.CAPTAIN, CHARACTERS.AMBASSADOR],
    challengeable: true,
    description: 'Claim Captain. Take 2 coins from another player.',
  },
  [ACTIONS.EXCHANGE]: {
    cost: 0,
    requires: CHARACTERS.AMBASSADOR,
    targeted: false,
    blockableBy: [],
    challengeable: true,
    description: 'Claim Ambassador. Exchange cards with the Court Deck.',
  },
};

// ─── Game phases ───────────────────────────────────────────────────────────────
export const PHASES = {
  WAITING: 'waiting',
  ACTION: 'action',           // Current player chooses action
  BLOCK_CHALLENGE: 'block_challenge', // Others may challenge or block
  BLOCK_CHALLENGE_RESPONSE: 'block_challenge_response', // Blocker may be challenged
  LOSE_INFLUENCE: 'lose_influence', // A player must reveal/discard a card
  EXCHANGE: 'exchange',       // Ambassador card exchange
  GAME_OVER: 'game_over',
};

// ─── Deck composition (3 of each character, standard 5-character set) ──────────
export const DECK_COMPOSITION = [
  CHARACTERS.DUKE,
  CHARACTERS.DUKE,
  CHARACTERS.DUKE,
  CHARACTERS.ASSASSIN,
  CHARACTERS.ASSASSIN,
  CHARACTERS.ASSASSIN,
  CHARACTERS.CAPTAIN,
  CHARACTERS.CAPTAIN,
  CHARACTERS.CAPTAIN,
  CHARACTERS.AMBASSADOR,
  CHARACTERS.AMBASSADOR,
  CHARACTERS.AMBASSADOR,
  CHARACTERS.CONTESSA,
  CHARACTERS.CONTESSA,
  CHARACTERS.CONTESSA,
];

// Starting coins per player
export const STARTING_COINS = 2;

// Must Coup if ≥ 10 coins
export const MUST_COUP_AT = 10;

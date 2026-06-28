export const ACTIONS = {
  INCOME: 'Income',
  FOREIGN_AID: 'ForeignAid',
  COUP: 'Coup',
  TAX: 'Tax',
  ASSASSINATE: 'Assassinate',
  STEAL: 'Steal',
  EXCHANGE: 'Exchange',
};

export const PHASES = {
  ACTION: 'action',
  BLOCK_CHALLENGE: 'block_challenge',
  BLOCK_CHALLENGE_RESPONSE: 'block_challenge_response',
  LOSE_INFLUENCE: 'lose_influence',
  EXCHANGE: 'exchange',
  GAME_OVER: 'game_over',
};

export const ACTION_DEFS = {
  [ACTIONS.INCOME]: {
    label: 'Income',
    cost: 0,
    targeted: false,
    description: 'Take 1 coin from the treasury.',
    character: null,
  },
  [ACTIONS.FOREIGN_AID]: {
    label: 'Foreign Aid',
    cost: 0,
    targeted: false,
    description: 'Take 2 coins. Can be blocked by Duke.',
    character: null,
  },
  [ACTIONS.COUP]: {
    label: 'Coup',
    cost: 7,
    targeted: true,
    description: 'Pay 7 coins. Force a player to lose an influence. Cannot be blocked.',
    character: null,
  },
  [ACTIONS.TAX]: {
    label: 'Tax',
    cost: 0,
    targeted: false,
    description: 'Claim Duke. Take 3 coins from treasury.',
    character: 'Duke',
  },
  [ACTIONS.ASSASSINATE]: {
    label: 'Assassinate',
    cost: 3,
    targeted: true,
    description: 'Pay 3 coins. Claim Assassin. Force a player to lose influence. Blockable by Contessa.',
    character: 'Assassin',
  },
  [ACTIONS.STEAL]: {
    label: 'Steal',
    cost: 0,
    targeted: true,
    description: 'Claim Captain. Take 2 coins from another player.',
    character: 'Captain',
  },
  [ACTIONS.EXCHANGE]: {
    label: 'Exchange',
    cost: 0,
    targeted: false,
    description: 'Claim Ambassador. Exchange cards with the Court Deck.',
    character: 'Ambassador',
  },
};

// Character -> color theme
export const CHARACTER_COLORS = {
  Duke:       { bg: 'bg-purple-900/40',  border: 'border-purple-500',  text: 'text-purple-300',  glow: 'shadow-purple-500/40'  },
  Assassin:   { bg: 'bg-red-900/40',     border: 'border-red-500',     text: 'text-red-300',     glow: 'shadow-red-500/40'     },
  Captain:    { bg: 'bg-teal-900/40',    border: 'border-teal-500',    text: 'text-teal-300',    glow: 'shadow-teal-500/40'    },
  Ambassador: { bg: 'bg-emerald-900/40', border: 'border-emerald-500', text: 'text-emerald-300', glow: 'shadow-emerald-500/40' },
  Contessa:   { bg: 'bg-rose-900/40',    border: 'border-rose-500',    text: 'text-rose-300',    glow: 'shadow-rose-500/40'    },
  hidden:     { bg: 'bg-slate-800/60',   border: 'border-slate-600',   text: 'text-slate-400',   glow: 'shadow-slate-500/20'   },
};

export const BLOCK_OPTIONS = {
  ForeignAid: [{ character: 'Duke', label: 'Block as Duke' }],
  Assassinate: [{ character: 'Contessa', label: 'Block as Contessa' }],
  Steal: [
    { character: 'Captain', label: 'Block as Captain' },
    { character: 'Ambassador', label: 'Block as Ambassador' },
  ],
};

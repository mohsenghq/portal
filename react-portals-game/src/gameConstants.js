export const GRID_SIZE_X = 7;
export const GRID_SIZE_Y = 11;
export const CENTER_X = Math.floor(GRID_SIZE_X / 2);
export const CENTER_Y = Math.floor(GRID_SIZE_Y / 2);

export const BOSSES = [
  { name: "Light Mage", damage: 6, amount: 1, type: 'boss' },
  { name: "Dark Mage", damage: 10, amount: 1, type: 'boss' },
  { name: "Golem", damage: 15, amount: 1, type: 'boss' },
];

export const MONSTERS = [
  { name: "Bug", damage: 1, amount: 5, type: 'monster' },
  { name: "Eye", damage: 8, amount: 1, type: 'eye' },
  { name: "Blue ghost", damage: 3, amount: 4, type: 'monster' },
  { name: "Purple ghost", damage: 7, amount: 1, type: 'monster' },
  { name: "Red ghost", damage: 5, amount: 3, type: 'monster' },
  { name: "Bottomless pit", damage: 100, amount: 8, type: 'pit' },
  { name: "Rat", damage: 2, amount: 5, type: 'monster' },
  { name: "Skeleton", damage: 4, amount: 5, type: 'monster' },
  { name: "Snake", damage: 6, amount: 2, type: 'monster' }
];

export const ALL_ENTITIES = [...BOSSES, ...MONSTERS];

export const INITIAL_HEALTH = 6;
export const POTION_COUNT = 12;
export const GUARANTEED_POTIONS = 2;
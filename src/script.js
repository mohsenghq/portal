const gridSizeX = 7;
const gridSizeY = 11;
const centerX = Math.floor(gridSizeX / 2);
const centerY = Math.floor(gridSizeY / 2);
let health, maxHealth, isFlagMode, defeatedBossesCount;
let player;
let userProfile = {};
const ACHIEVEMENTS = {
  FIRST_WIN: { name: "Novice Adventurer", description: "Win your first game." },
  SLAYER: { name: "Monster Slayer", description: "Defeat 100 monsters total." },
  PERFECTIONIST: {
    name: "Perfectionist",
    description: "Win a game with full health.",
  },
};
const grid = [];
const BOSSES = [
  { name: "Light Mage", damage: 6, amount: 1, type: "boss", xp: 50, gold: 6 },
  { name: "Dark Mage", damage: 10, amount: 1, type: "boss", xp: 100, gold: 10 },
  { name: "Golem", damage: 15, amount: 1, type: "boss", xp: 200, gold: 15 },
];
const MONSTERS = [
  { name: "Bug", damage: 1, amount: 5, type: "monster", xp: 2, gold: 1 },
  { name: "Eye", damage: 8, amount: 1, type: "eye", xp: 16, gold: 8 },
  { name: "Blue ghost", damage: 3, amount: 4, type: "monster", xp: 6, gold: 3 },
  {
    name: "Purple ghost",
    damage: 7,
    amount: 1,
    type: "monster",
    xp: 14,
    gold: 7,
  },
  { name: "Red ghost", damage: 5, amount: 3, type: "monster", xp: 10, gold: 5 },
  {
    name: "Bottomless pit",
    damage: 100,
    amount: 8,
    type: "pit",
    xp: 0,
    gold: 0,
  },
  { name: "Rat", damage: 2, amount: 5, type: "monster", xp: 4, gold: 2 },
  { name: "Skeleton", damage: 4, amount: 5, type: "monster", xp: 8, gold: 4 },
  { name: "Snake", damage: 6, amount: 2, type: "monster", xp: 12, gold: 6 },
];
// Add this new constant for shop items
const SHOP_ITEMS = [
  {
    id: "heal_5",
    name: "Health Potion",
    description: "Instantly restore 5 HP.",
    price: 25,
    icon: "potion.png",
    onBuy: (player) => {
      player.health = Math.min(player.maxHealth, player.health + 5);
      showFloatingStatText(
        "+5",
        document.getElementById("health-display"),
        "text-green-400"
      );
    },
  },
  {
    id: "max_hp_up",
    name: "Heart Container",
    description: "Permanently increase Max HP by 2.",
    price: 75,
    icon: "heart.png",
    onBuy: (player) => {
      player.maxHealth += 2;
      player.health += 2;
      showFloatingStatText(
        "+2 Max",
        document.getElementById("health-display"),
        "text-pink-400"
      );
    },
  },
  {
    id: "reveal_monster",
    name: "Spyglass",
    description: "Reveal one random, hidden monster.",
    price: 40,
    icon: "eye.png",
    onBuy: (player, grid) => {
      const hiddenMonsters = grid.filter(
        (t) => !t.revealed && ["monster", "eye", "boss"].includes(t.type)
      );
      if (hiddenMonsters.length > 0) {
        const randomMonster =
          hiddenMonsters[Math.floor(Math.random() * hiddenMonsters.length)];
        randomMonster.revealed = true;
      }
    },
  },
];

// Add a new entity for the Shop itself
const SPECIAL_TILES = [{ name: "Shop", amount: 1, type: "shop", damage: 0 }];

// Modify ALL_ENTITIES to include this new type
const ALL_ENTITIES = [...BOSSES, ...MONSTERS, ...SPECIAL_TILES];

const DIFFICULTY_SETTINGS = {
  easy: {
    name: "Easy",
    monsterDamageMultiplier: 0.75,
    monsterXpMultiplier: 0.8,
    potionCount: 15,
    startingGold: 20,
  },
  normal: {
    name: "Normal",
    monsterDamageMultiplier: 1.0,
    monsterXpMultiplier: 1.0,
    potionCount: 12,
    startingGold: 0,
  },
  hard: {
    name: "Hard",
    monsterDamageMultiplier: 1.25,
    monsterXpMultiplier: 1.2,
    potionCount: 9,
    startingGold: 0,
  },
};

// Add new global state variables
let currentDifficulty;
let currentLoop = 1;
let runStats;
// DOM Elements
const healthValueEl = document.getElementById("health-value");
const maxHealthEl = document.getElementById("max-health");
const gridEl = document.getElementById("grid");
const newGameBtn = document.getElementById("new-game-btn");
const newGameFooterBtn = document.getElementById("new-game-footer-btn");
const bossNameEl = document.getElementById("boss-name");
const bossProgressEl = document.getElementById("boss-progress");
const monsterInfoPanel = document.getElementById("monster-info-panel");
const gridWrapper = document.getElementById("grid-wrapper");
const gameOverContainer = document.getElementById("game-over-container");
const popupEl = document.getElementById("popup");
const popupTitleEl = document.getElementById("popup-title");
const flagModeBtn = document.getElementById("flag-mode-btn");
const monsterPanelBtn = document.getElementById("monster-panel-btn");
const mobileMonsterPopup = document.getElementById("mobile-monster-popup");
const mobilePopupContent = mobileMonsterPopup.querySelector(".popup-content");
const closeMonsterPopup = document.getElementById("close-monster-popup");
const mobileMonsterList = document.getElementById("mobile-monster-list");
const headerTextEl = document.getElementById("header-text");

const profileBtn = document.getElementById("profile-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileModalBtn = document.getElementById("close-profile-modal");
const profileContent = document.getElementById("profile-content");

// --- SHOP LOGIC ---
const shopModal = document.getElementById("shop-modal");
const shopContent = document.getElementById("shop-content");
const closeShopModalBtn = document.getElementById("close-shop-modal");

function openShopModal() {
  renderShop();
  shopModal.classList.remove("invisible", "opacity-0");
  shopContent.classList.remove("scale-95");
}

function closeShopModal() {
  shopModal.classList.add("invisible", "opacity-0");
  shopContent.classList.add("scale-95");
  // After closing the shop, we might need to update the main display
  updateDisplay();
  grid.forEach((_, i) => updateTileDisplay(i));
}

function renderShop() {
  const itemListEl = document.getElementById("shop-item-list");
  const shopGoldEl = document.getElementById("shop-gold-display");

  shopGoldEl.innerText = player.gold;
  itemListEl.innerHTML = ""; // Clear previous items

  SHOP_ITEMS.forEach((item) => {
    const canAfford = player.gold >= item.price;
    const itemEl = document.createElement("div");
    itemEl.className = `flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700`;
    itemEl.innerHTML = `
            <img src="icons/${
              item.icon
            }" class="w-10 h-10 object-contain bg-slate-700 p-1 rounded-md">
    <div class="flex-grow">
        <h4 class="font-bold text-lg text-slate-100">${item.name}</h4>
        <p class="text-sm text-slate-400">${item.description}</p>
    </div>
            <button class="buy-btn text-lg font-bold px-5 py-2 rounded-md transition-colors ${
              canAfford
                ? "bg-green-600 hover:bg-green-500"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }" ${!canAfford ? "disabled" : ""}>
                ${item.price} G
            </button>
        `;

    if (canAfford) {
      itemEl.querySelector(".buy-btn").addEventListener("click", () => {
        player.gold -= item.price;
        item.onBuy(player, grid);
        showFloatingStatText(
          `-${item.price}`,
          document.getElementById("gold-display"),
          "text-yellow-400"
        );
        renderShop(); // Re-render to update gold and button states
      });
    }

    itemListEl.appendChild(itemEl);
  });
}

// --- Game Initialization & State ---

function initializeGrid(difficulty = "normal", isNewGame = true) {
  currentDifficulty = difficulty;
  const settings = DIFFICULTY_SETTINGS[difficulty];

  if (isNewGame) {
    currentLoop = 1;
    // Reset the persistent profile only for a brand new session, if needed
    // (we are keeping level/xp, so this part is for game-specific stats)
    player = {
      health: 6,
      maxHealth: 6,
      gold: settings.startingGold,
    };
  } else {
    // Continuing an endless run
    currentLoop++;
    player.health = player.maxHealth; // Heal to full for the next loop
  }

  // Initialize stats for this specific run
  runStats = {
    startTime: Date.now(),
    monstersKilled: 0,
    goldCollected: 0,
    damageTaken: 0,
    loop: currentLoop,
  };

  // Reset grid and game state
  defeatedBossesCount = 0;
  gridEl.innerHTML = "";
  grid.length = 0;
  gridEl.style.pointerEvents = "auto";
  if (headerTextEl) headerTextEl.style.display = "inline";
  closeEndGamePopup(true);
  isFlagMode = false;
  flagModeBtn.classList.remove("bg-sky-500/50");

  // Create Tiles
  for (let i = 0; i < gridSizeX * gridSizeY; i++) {
    const tileEl = document.createElement("div");
    tileEl.addEventListener("click", () => handleTileClick(i));
    gridEl.appendChild(tileEl);
    grid.push({
      type: "hidden",
      value: 0,
      damage: 0,
      flagged: false,
      revealed: false,
      hasPotion: false,
      potionUsed: false,
      monsterName: null,
      isDefeated: false,
      isHiddenByEye: false,
    });
  }

  placeElements(settings); // Pass settings to scale monsters
  updateNumbers();

  // Reveal center area
  for (let j = centerY - 1; j <= centerY + 1; j++) {
    for (let i = centerX - 1; i <= centerX + 1; i++) {
      const index = j * gridSizeX + i;
      if (grid[index]) {
        grid[index].revealed = true;
        if (grid[index].type === "hidden") {
          grid[index].type = "empty";
        }
      }
    }
  }

  // Initial Render
  resizeGrid();
  updateMonsterInfoPanel();
  grid.forEach((_, index) => updateTileDisplay(index));
  updateDisplay();
}

function placeElements(settings) {
  const startAreaIndices = Array.from(
    { length: 9 },
    (_, i) =>
      (centerY - 1 + Math.floor(i / 3)) * gridSizeX + (centerX - 1 + (i % 3))
  );

  const placeEntity = (entity, count) => {
    // Create a copy of the entity to modify its stats for this run
    const entityInstance = { ...entity };

    // Apply difficulty and endless loop scaling
    const loopMultiplier = 1 + 0.2 * (currentLoop - 1); // +20% per loop
    entityInstance.damage = Math.ceil(
      entityInstance.damage * settings.monsterDamageMultiplier * loopMultiplier
    );
    entityInstance.xp = Math.ceil(
      (entityInstance.xp || 0) * settings.monsterXpMultiplier
    ); // XP doesn't scale with loops

    for (let i = 0; i < count; i++) {
      let index;
      do {
        index = Math.floor(Math.random() * grid.length);
      } while (
        grid[index].type !== "hidden" ||
        (entity.type === "eye" && startAreaIndices.includes(index))
      );

      // Use the scaled stats from entityInstance
      grid[index] = {
        ...grid[index],
        type: entityInstance.type,
        damage: entityInstance.damage,
        monsterName: entityInstance.name,
      };
      if (entityInstance.type === "eye") hideNumbersAroundEye(index);
    }
  };

  ALL_ENTITIES.forEach((m) => placeEntity(m, m.amount));

  // Use the potion count from settings
  const potionCount = settings.potionCount;

  const guaranteedPotions = 2;
  let placedPotions = 0;
  const safeStartTiles = startAreaIndices.filter(
    (index) => grid[index].type === "hidden"
  );

  for (let i = 0; i < guaranteedPotions && safeStartTiles.length > 0; i++) {
    const randIndex = Math.floor(Math.random() * safeStartTiles.length);
    const tileIndex = safeStartTiles.splice(randIndex, 1)[0];
    grid[tileIndex].hasPotion = true;
    grid[tileIndex].type = "empty";
    placedPotions++;
  }

  while (placedPotions < potionCount) {
    let index = Math.floor(Math.random() * grid.length);
    if (grid[index].type === "hidden") {
      grid[index].hasPotion = true;
      grid[index].type = "empty";
      placedPotions++;
    }
  }
}

// --- Core Game Logic ---

function handleTileClick(index) {
  const tile = grid[index];
  // Note: We use isDefeated to also mean "used" for potions
  if (tile.isDefeated || tile.potionUsed || (tile.flagged && !isFlagMode))
    return;

  if (isFlagMode) {
    if (!tile.revealed) {
      tile.flagged = !tile.flagged;
      updateTileDisplay(index);
    }
    return;
  }

  // --- REVEAL LOGIC ---
  if (!tile.revealed) {
    tile.revealed = true;
    if (tile.type === "hidden") {
      tile.type = "empty";
    }
    // If the revealed tile is a potion, just show it and wait for the next click.
    if (tile.hasPotion) {
      updateTileDisplay(index);
      return;
    }
  }

  // --- ACTION LOGIC (for already revealed tiles) ---
  else if (tile.hasPotion && !tile.potionUsed) {
    player.health = player.maxHealth;
    tile.potionUsed = true;
    showFloatingStatText(
      "Restored!",
      document.getElementById("health-display"),
      "text-green-400"
    );
  } else if (tile.type === "shop") {
    openShopModal();
    return; // Stop processing after opening the shop
  }

  // --- MONSTER LOGIC ---
  // This logic is now separate from the reveal logic above.
  if (
    ["monster", "eye", "pit", "boss"].includes(tile.type) &&
    !tile.isDefeated
  ) {
    let damageTaken = tile.damage;
    runStats.damageTaken += damageTaken;

    if (player.health < damageTaken) {
      player.health -= damageTaken;
      endGame("You Died...", false);
    } else {
      player.health -= damageTaken;
    }

    tile.isDefeated = true;

    const monsterData = ALL_ENTITIES.find((m) => m.name === tile.monsterName);
    if (monsterData) {
      userProfile.xp += monsterData.xp;
      player.gold += monsterData.gold;
      runStats.goldCollected += monsterData.gold;
      runStats.monstersKilled++;
      userProfile.totalKills = (userProfile.totalKills || 0) + 1;
      saveProfile();

      showFloatingStatText(
        `-${damageTaken}`,
        document.getElementById("health-display"),
        "text-red-400"
      );
      if (monsterData.gold > 0)
        showFloatingStatText(
          `+${monsterData.gold}`,
          document.getElementById("gold-display"),
          "text-yellow-400"
        );
      if (monsterData.xp > 0)
        showFloatingStatText(
          `+${monsterData.xp}`,
          document.getElementById("xp-bar"),
          "text-purple-400"
        );
    }

    if (tile.type === "eye") {
      revealNumbersAroundEye(index);
    }

    const xpToNextLevel = userProfile.level * 100;
    if (userProfile.xp >= xpToNextLevel) {
      userProfile.level++;
      userProfile.xp -= xpToNextLevel;
      saveProfile(); // Save progress on level up!

      // Give a reward for the current game
      player.maxHealth += 2;
      player.health = player.maxHealth;
      showFloatingStatText(
        "Level Up!",
        document.getElementById("player-level"),
        "text-green-400"
      );
    }

    if (tile.type === "boss") {
      defeatedBossesCount++;
      if (tile.monsterName === "Light Mage") {
        player.maxHealth += 4;
        player.health = player.maxHealth;
        showFloatingStatText(
          "+4 Max HP",
          document.getElementById("health-display"),
          "text-green-400"
        );
      }
      if (tile.monsterName === "Dark Mage") {
        player.maxHealth += 5;
        player.health = player.maxHealth;
        showFloatingStatText(
          "+5 Max HP",
          document.getElementById("health-display"),
          "text-green-400"
        );
      }
    }
  }

  // --- FINAL UPDATES & CHECKS ---
  updateNumbers();
  updateMonsterInfoPanel();
  updateDisplay();
  grid.forEach((_, i) => updateTileDisplay(i));

  if (player.health < 0) {
    endGame("You Died...", false);
  } else if (tile.monsterName === "Golem" && tile.isDefeated) {
    endGame("You Win!", true);
  }
}

function updateNumbers() {
  for (let i = 0; i < grid.length; i++) {
    let totalDamage = 0;
    const y = Math.floor(i / gridSizeX);
    const x = i % gridSizeX;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridSizeX && ny >= 0 && ny < gridSizeY) {
          const neighbor = grid[ny * gridSizeX + nx];
          if (
            ["monster", "pit", "boss", "eye"].includes(neighbor.type) &&
            !neighbor.isDefeated
          ) {
            totalDamage += neighbor.damage;
          }
        }
      }
    }
    grid[i].value = totalDamage;
  }
}

// --- UI Updates & Rendering ---

function updateTileDisplay(index) {
  const tileEl = gridEl.children[index];
  const tile = grid[index];
  tileEl.innerHTML = "";

  // Base classes for all tiles
  const baseClasses = [
    "relative",
    "aspect-square",
    "flex",
    "items-center",
    "justify-center",
    "cursor-pointer",
    "rounded-sm",
    "transition-all",
    "duration-200",
    "font-bold",
    "text-base",
    "select-none",
  ];
  tileEl.className = baseClasses.join(" ");

  if (tile.flagged) {
    tileEl.classList.add("bg-slate-500");
    tileEl.innerHTML = `<div class="w-4/5 h-4/5 bg-contain bg-center bg-no-repeat" style="background-image: url('icons/flag.png');"></div>`;
    return;
  }

  if (!tile.revealed) {
    tileEl.classList.add("bg-slate-500", "hover:bg-slate-400");
    return;
  }

  // --- REVEALED TILE STYLES ---
  tileEl.classList.add("bg-slate-700", "animate-pop-in");

  const isMonster = ["monster", "boss", "eye", "pit"].includes(tile.type);

  if (isMonster) {
    const iconClass =
      tile.type === "pit" ? "pit" : tile.monsterName.replace(/\s+/g, "-");

    // Set opacity class only if the monster is defeated
    const opacityClass = tile.isDefeated ? "opacity-30" : "";

    // The icon's position is now static and does not change on defeat
    const positionClass =
      tile.type === "pit" ? "w-4/5 h-4/5" : "absolute top-0 w-3/5 h-3/5";
    const iconDiv = `<div class="${positionClass} ${iconClass} bg-contain bg-no-repeat bg-center ${opacityClass} transition-opacity"></div>`;

    // The damage number's position is also static
    const damageDiv =
      tile.type !== "pit"
        ? `<span class="absolute bottom-0 text-yellow-400 font-bold text-sm ${opacityClass}">${tile.damage}</span>`
        : "";

    // The centered value number is added ONLY when the monster is defeated
    const valueDiv =
      tile.isDefeated && tile.value >= 0
        ? `<span class="relative z-10 text-white text-base">${
            tile.isHiddenByEye ? "?" : tile.value
          }</span>`
        : "";

    // Assemble the final HTML. The valueDiv will be an empty string for active monsters.
    tileEl.innerHTML = `${iconDiv}${damageDiv}${valueDiv}`;
  } else if (tile.type === "shop") {
    // Show a shop icon. It has no threat value.
    tileEl.innerHTML = `<div class="w-4/5 h-4/5 bg-contain bg-center bg-no-repeat" style="background-image: url('icons/shop.png');"></div>`;
  } else if (tile.type === "empty") {
    if (tile.hasPotion) {
      if (tile.potionUsed) {
        // MODIFIED: Faded icon in center, opaque number on top
        const potionIcon = `<div class="potion-icon absolute inset-0 opacity-30"></div>`;
        const valueText =
          tile.value >= 0
            ? `<span class="relative z-10 text-white text-base">${
                tile.isHiddenByEye ? "?" : tile.value
              }</span>`
            : "";
        tileEl.innerHTML = `${potionIcon}${valueText}`;
      } else {
        // Unused Potion: Icon at top, value at bottom
        const potionIcon = `<div class="potion-icon absolute top-0 w-[65%] h-[65%]"></div>`;
        const valueText =
          tile.value >= 0
            ? `<span class="absolute bottom-0 text-xs text-white">${
                tile.isHiddenByEye ? "?" : tile.value
              }</span>`
            : "";
        tileEl.innerHTML = `${potionIcon}${valueText}`;
      }
    } else {
      // No potion, just the number
      if (tile.value >= 0)
        tileEl.innerHTML = `<span class="text-white text-base">${
          tile.isHiddenByEye ? "?" : tile.value
        }</span>`;
    }
  }
}

function updateMonsterInfoPanel() {
  const allMonsterTypes = [
    ...BOSSES,
    ...MONSTERS.filter((m) => m.type !== "pit"),
  ];
  const generateHtml = (monster) => {
    const remaining = grid.filter(
      (tile) => tile.monsterName === monster.name && !tile.isDefeated
    ).length;
    const isCleared = remaining === 0;
    const iconClass = monster.name.replace(/\s+/g, "-");
    return `
            <div class="monster-entry flex items-center gap-2 p-1.5 bg-slate-700 rounded-md border border-slate-600 transition-all duration-300 ${
              isCleared ? "opacity-50 grayscale" : ""
            }">
                <div class="icon w-6 h-6 bg-contain bg-no-repeat bg-center ${iconClass}"></div>
                <div class="details flex flex-col flex-grow">
                    <span class="name font-bold text-sm text-slate-100">${
                      monster.name
                    }</span>
                    <span class="stats text-xs text-slate-400">Dmg: ${
                      monster.damage
                    }</span>
                </div>
                <div class="count text-base font-bold ${
                  isCleared ? "text-slate-500" : "text-sky-400"
                }">${remaining}/${monster.amount}</div>
            </div>
        `;
  };
  const panelHtml = allMonsterTypes.map(generateHtml).join("");
  monsterInfoPanel.innerHTML = panelHtml;
  // Mobile list uses a different class structure for now, can be updated if needed
  mobileMonsterList.innerHTML = panelHtml
    .replaceAll("p-1.5", "p-2.5")
    .replaceAll("w-6 h-6", "w-8 h-8");
}

function updateDisplay() {
  // Health
  healthValueEl.innerText = Math.max(0, player.health);
  maxHealthEl.innerText = player.maxHealth;

  const goldValueEl = document.getElementById("gold-value");
  if (goldValueEl) {
    goldValueEl.innerText = player.gold;
  }
  // --- END NEW ---

  // Level and XP
  const playerLevelEl = document.getElementById("player-level");
  if (playerLevelEl) playerLevelEl.innerText = userProfile.level;

  const xpBarEl = document.getElementById("xp-bar");
  if (xpBarEl) {
    const xpToNextLevel = userProfile.level * 100;
    const xpPercentage =
      xpToNextLevel > 0 ? (userProfile.xp / xpToNextLevel) * 100 : 0;
    xpBarEl.style.width = `${xpPercentage}%`;
  }

  // Boss Info
  const currentBoss = BOSSES[defeatedBossesCount];
  if (currentBoss) {
    bossNameEl.innerText = currentBoss.name;
    bossProgressEl.innerText = `(${defeatedBossesCount}/3)`;
  } else {
    bossNameEl.innerText = "All Bosses Cleared!";
    bossProgressEl.innerText = `(3/3)`;
  }
}

function openProfileModal() {
  renderProfile(); // Populate with latest data before showing
  profileModal.classList.remove("invisible", "opacity-0");
  profileContent.classList.remove("scale-95");
}

function closeProfileModal() {
  profileModal.classList.add("invisible", "opacity-0");
  profileContent.classList.add("scale-95");
}

function renderProfile() {
  const statsList = document.getElementById("profile-stats-list");
  const achievementsList = document.getElementById("achievements-list");

  // Render Stats
  statsList.innerHTML = `
        <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-green-400">${
          userProfile.wins
        }</div><div class="text-sm text-slate-400">Games Won</div></div>
        <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-red-400">${
          userProfile.totalKills
        }</div><div class="text-sm text-slate-400">Total Kills</div></div>
        <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-purple-400">${userProfile.level}</div><div class="text-sm text-slate-400">Current Level</div></div>
        <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-yellow-400">${
          Object.keys(userProfile.achievements).length
        }</div><div class="text-sm text-slate-400">Achievements</div></div>
    `;

  // Render Achievements
  achievementsList.innerHTML = ""; // Clear old list
  for (const key in ACHIEVEMENTS) {
    const ach = ACHIEVEMENTS[key];
    const isUnlocked = userProfile.achievements[key];

    achievementsList.innerHTML += `
            <div class="flex items-center gap-3 p-2 rounded-md transition-all ${
              isUnlocked ? "bg-yellow-600/20" : "bg-slate-700 opacity-60"
            }">
                <img src="icons/achievement_${
                  isUnlocked ? "unlocked" : "locked"
                }.png" class="w-10 h-10">
                <div>
                    <h5 class="font-bold ${
                      isUnlocked ? "text-yellow-400" : "text-slate-300"
                    }">${ach.name}</h5>
                    <p class="text-sm text-slate-400">${ach.description}</p>
                </div>
            </div>
        `;
  }
}

function resizeGrid() {
  const wrapperRect = gridWrapper.getBoundingClientRect();
  const isMobile = window.innerWidth < 1024; // lg breakpoint

  let gridWidth, gridHeight;

  if (isMobile) {
    // On mobile, height is the constraint.
    gridHeight = wrapperRect.height * 0.88; // Use 88% of available height
    gridWidth = gridHeight * (gridSizeX / gridSizeY);
  } else {
    // On desktop, fit within the available space.
    const maxWidth = wrapperRect.width;
    const maxHeight = wrapperRect.height;
    if (maxWidth / maxHeight > gridSizeX / gridSizeY) {
      // Limited by height
      gridHeight = maxHeight;
      gridWidth = maxHeight * (gridSizeX / gridSizeY);
    } else {
      // Limited by width
      gridWidth = maxWidth;
      gridHeight = maxWidth * (gridSizeY / gridSizeX);
    }
  }

  gridEl.style.width = `${gridWidth}px`;
  gridEl.style.height = `${gridHeight}px`;
}

// --- Popups and Modals ---

function endGame(title, isWin) {
  if (gameOverContainer.classList.contains("visible")) return; // Prevent double trigger

  // --- Save Profile ---
  if (isWin) {
    userProfile.wins = (userProfile.wins || 0) + 1;
    checkAchievements("win");
  }
  saveProfile();

  // --- Render Run Stats ---
  const statsContainer = document.getElementById("run-stats-container");
statsContainer.innerHTML = ''; // Clear stats by default

// Only display stats if a run has actually happened
if (runStats) {
    const timePlayed = ((Date.now() - runStats.startTime) / 1000).toFixed(1);
    statsContainer.innerHTML = `
        <h3 class="text-lg font-bold text-sky-400 mb-2">Run Summary (Loop ${runStats.loop})</h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span class="text-slate-400">Time Played:</span><span class="text-white font-semibold">${timePlayed}s</span>
            <span class="text-slate-400">Monsters Slain:</span><span class="text-white font-semibold">${runStats.monstersKilled}</span>
            <span class="text-slate-400">Gold Collected:</span><span class="text-white font-semibold">${runStats.goldCollected}</span>
            <span class="text-slate-400">Damage Taken:</span><span class="text-white font-semibold">${runStats.damageTaken}</span>
        </div>
    `;
}
  // --- Render New Game Options ---
  const optionsContainer = document.getElementById("new-game-options");
  optionsContainer.innerHTML = ""; // Clear previous buttons

  // If it's a win and it was the Golem, show Endless Mode option
  const isGolemWin =
    isWin && grid.find((t) => t.monsterName === "Golem" && t.isDefeated);
  if (isGolemWin) {
    const continueBtn = document.createElement("button");
    continueBtn.className =
      "px-6 py-3 text-lg font-bold text-white bg-purple-600 rounded-lg cursor-pointer transition-colors hover:bg-purple-500";
    continueBtn.innerText = `Continue to Loop ${currentLoop + 1}`;
    continueBtn.addEventListener("click", () =>
      initializeGrid(currentDifficulty, false)
    ); // false = not a new game
    optionsContainer.appendChild(continueBtn);
    optionsContainer.innerHTML += `<p class="text-sm text-slate-400 my-2">Or start a new game:</p>`;
  }

  // Show difficulty options
  Object.keys(DIFFICULTY_SETTINGS).forEach((key) => {
    const btn = document.createElement("button");
    btn.className =
      "px-6 py-2 text-md font-bold text-white bg-sky-700 rounded-lg cursor-pointer transition-colors hover:bg-sky-600";
    btn.innerText = DIFFICULTY_SETTINGS[key].name;
    btn.addEventListener("click", () => initializeGrid(key, true)); // true = is a new game
    optionsContainer.appendChild(btn);
  });

  // --- Show the Popup ---
  gridEl.style.pointerEvents = "none";
  gridEl.classList.add("filter", "brightness-[.4]");
  popupTitleEl.innerText = title;
  popupTitleEl.className = `text-4xl font-extrabold ${
    isWin ? "text-green-400" : "text-red-500"
  }`;
  gameOverContainer.classList.remove("invisible", "opacity-0");
  popupEl.classList.remove("scale-95");
}

function closeEndGamePopup(isNewGame = false) {
  gameOverContainer.classList.remove("visible", "opacity-100");
  gameOverContainer.classList.add("invisible", "opacity-0");
  popupEl.classList.remove("scale-100");
  popupEl.classList.add("scale-95");
  gridEl.classList.remove("brightness-[.4]");
  if (!isNewGame) {
    newGameFooterBtn.classList.remove("hidden");
  }
}

function showMobileMonsterPanel() {
  mobileMonsterPopup.classList.remove("invisible", "opacity-0");
  mobileMonsterPopup.classList.add("visible", "opacity-100");
  mobilePopupContent.classList.remove("scale-95");
  mobilePopupContent.classList.add("scale-100");
}

function hideMobileMonsterPanel() {
  mobileMonsterPopup.classList.remove("visible", "opacity-100");
  mobileMonsterPopup.classList.add("invisible", "opacity-0");
  mobilePopupContent.classList.remove("scale-100");
  mobilePopupContent.classList.add("scale-95");
}

function showFloatingStatText(text, targetElement, colorClass) {
  if (!targetElement) return; // Don't run if the target element doesn't exist

  const textEl = document.createElement("div");
  textEl.innerText = text;

  // Use our new, cleaner animation class
  textEl.className = `absolute text-xl font-bold pointer-events-none z-[200] ${colorClass} animate-float-up`;
  textEl.style.textShadow = "1px 1px 2px rgba(0,0,0,0.7)";

  // We append to the document body to make sure it can be positioned anywhere on screen
  document.body.appendChild(textEl);

  // Position the text over the target UI element
  const rect = targetElement.getBoundingClientRect();
  textEl.style.left = `${rect.left + rect.width / 2}px`;
  textEl.style.top = `${rect.top}px`;

  // Clean up the element after the animation finishes
  setTimeout(() => textEl.remove(), 2000);
}

// --- Utility Functions ---
function hideNumbersAroundEye(eyeIndex) {
  const y = Math.floor(eyeIndex / gridSizeX),
    x = eyeIndex % gridSizeX;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < gridSizeX && ny >= 0 && ny < gridSizeY)
        grid[ny * gridSizeX + nx].isHiddenByEye = true;
    }
}

function revealNumbersAroundEye(eyeIndex) {
  const y = Math.floor(eyeIndex / gridSizeX),
    x = eyeIndex % gridSizeX;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < gridSizeX && ny >= 0 && ny < gridSizeY)
        grid[ny * gridSizeX + nx].isHiddenByEye = false;
    }
}

function checkAchievements(event) {
  let newAchievement = null;

  if (event === "win" && !userProfile.achievements.FIRST_WIN) {
    userProfile.achievements.FIRST_WIN = true;
    newAchievement = ACHIEVEMENTS.FIRST_WIN;
  }

  if (userProfile.totalKills >= 100 && !userProfile.achievements.SLAYER) {
    userProfile.achievements.SLAYER = true;
    newAchievement = ACHIEVEMENTS.SLAYER;
  }

  if (
    event === "win" &&
    player && // This check prevents an error on the welcome screen
    player.health === player.maxHealth &&
    !userProfile.achievements.PERFECTIONIST
) {
    userProfile.achievements.PERFECTIONIST = true;
    newAchievement = ACHIEVEMENTS.PERFECTIONIST;
  }

  if (newAchievement) {
    // Code to show a fancy "Achievement Unlocked!" popup
    console.log(`Achievement Unlocked: ${newAchievement.name}`);
    saveProfile();
  }
}

function loadProfile() {
  const savedProfile = localStorage.getItem("lostDogsProfile");
  if (savedProfile) {
    userProfile = JSON.parse(savedProfile);

    // --- FIX: Add default values if they are missing from an old save ---
    if (userProfile.level === undefined) {
      userProfile.level = 1;
    }
    if (userProfile.xp === undefined) {
      userProfile.xp = 0;
    }
    // --- End of fix ---
  } else {
    // Default profile for a brand new user
    userProfile = {
      wins: 0,
      totalKills: 0,
      level: 1,
      xp: 0,
      achievements: {},
    };
  }
}

function saveProfile() {
  localStorage.setItem("lostDogsProfile", JSON.stringify(userProfile));
}

// --- Event Listeners ---
// newGameBtn.addEventListener("click", initializeGrid);
// newGameFooterBtn.addEventListener("click", initializeGrid);

flagModeBtn.addEventListener("click", () => {
  isFlagMode = !isFlagMode;
  flagModeBtn.classList.toggle("bg-sky-500/50", isFlagMode);
});

monsterPanelBtn.addEventListener("click", showMobileMonsterPanel);
closeMonsterPopup.addEventListener("click", hideMobileMonsterPanel);

mobileMonsterPopup.addEventListener("click", (e) => {
  if (e.target === mobileMonsterPopup) hideMobileMonsterPanel();
});
gameOverContainer.addEventListener("click", (e) => {
  if (e.target === gameOverContainer) closeEndGamePopup();
});

window.addEventListener("resize", resizeGrid);

profileBtn.addEventListener("click", openProfileModal);
closeProfileModalBtn.addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) closeProfileModal();
});

closeShopModalBtn.addEventListener("click", closeShopModal);
shopModal.addEventListener("click", (e) => {
  if (e.target === shopModal) closeShopModal();
});

// Initial load
loadProfile();
endGame("Welcome!", true);

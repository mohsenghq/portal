const gridSizeX = 7;
const gridSizeY = 11;
const centerX = Math.floor(gridSizeX / 2);
const centerY = Math.floor(gridSizeY / 2);
let health, maxHealth, isFlagMode, defeatedBossesCount;
let player;
let userProfile = {};

const grid = [];
const BOSSES = [
  { name: "Light Mage", damage: 6, amount: 1, type: "boss", xp: 50 },
  { name: "Dark Mage", damage: 10, amount: 1, type: "boss", xp: 100 },
  { name: "Golem", damage: 15, amount: 1, type: "boss", xp: 200 },
];
const MONSTERS = [
  { name: "Bug", damage: 1, amount: 5, type: "monster", xp: 2 },
  { name: "Eye", damage: 8, amount: 1, type: "eye", xp: 16 },
  { name: "Blue ghost", damage: 3, amount: 4, type: "monster", xp: 6 },
  { name: "Purple ghost", damage: 7, amount: 1, type: "monster", xp: 14 },
  { name: "Red ghost", damage: 5, amount: 3, type: "monster", xp: 10 },
  { name: "Bottomless pit", damage: 100, amount: 8, type: "pit", xp: 0 },
  { name: "Rat", damage: 2, amount: 5, type: "monster", xp: 4 },
  { name: "Skeleton", damage: 4, amount: 5, type: "monster", xp: 8 },
  { name: "Snake", damage: 6, amount: 2, type: "monster", xp: 12 },
];

const ALL_ENTITIES = [...BOSSES, ...MONSTERS];

const DIFFICULTY_SETTINGS = {
  easy: {
    name: "Easy",
    monsterDamageMultiplier: 1.0,
    monsterXpMultiplier: 0.8,
    potionCount: 15,
  },
  normal: {
    name: "Normal",
    monsterDamageMultiplier: 1.0,
    monsterXpMultiplier: 1.0,
    potionCount: 12,
  },
  hard: {
    name: "Hard",
    monsterDamageMultiplier: 1.0,
    monsterXpMultiplier: 1.2,
    potionCount: 9,
  },
};

// Add new global state variables
let currentDifficulty;
let currentLoop = 1;
let runStats;
let isInitialLaunch = true; // Tracks if it's the first game load
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
const showSummaryBtn = document.getElementById("show-summary-btn");

const profileBtn = document.getElementById("profile-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileModalBtn = document.getElementById("close-profile-modal");
const profileContent = document.getElementById("profile-content");
// --- Game Initialization & State ---

function initializeGrid(difficulty = "normal", isNewGame = true) {
  isInitialLaunch = false; // The game has started, not the initial launch anymore
  currentDifficulty = difficulty;
  const settings = DIFFICULTY_SETTINGS[difficulty];

  if (isNewGame) {
    currentLoop = 1;
    // Reset the persistent profile only for a brand new session, if needed
    // (we are keeping level/xp, so this part is for game-specific stats)
    player = {
      health: 6,
      maxHealth: 6,
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
  showSummaryBtn.classList.add("hidden");

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

function countMonsterOrPitNeighbors(index) {
  let count = 0;
  const y = Math.floor(index / gridSizeX);
  const x = index % gridSizeX;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < gridSizeX && ny >= 0 && ny < gridSizeY) {
        const neighbor = grid[ny * gridSizeX + nx];
        if (["monster", "pit", "boss", "eye"].includes(neighbor.type)) {
          count++;
        }
      }
    }
  }
  return count;
}

function placeElements(settings) {
  const startAreaIndices = Array.from(
    { length: 9 },
    (_, i) =>
      (centerY - 1 + Math.floor(i / 3)) * gridSizeX + (centerX - 1 + (i % 3))
  );

  let centerBossPlaced = false;
  let centerPitPlaced = false;

  // Create a flat, shuffled list of all individual entities to place
  const entitiesToPlace = [];
  ALL_ENTITIES.forEach((entityType) => {
    for (let i = 0; i < entityType.amount; i++) {
      entitiesToPlace.push({ ...entityType });
    }
  });
  entitiesToPlace.sort(() => Math.random() - 0.5); // Shuffle for random placement order

  entitiesToPlace.forEach((entity) => {
    const entityInstance = { ...entity };
    const loopMultiplier = 1 + 0.2 * (currentLoop - 1); // +20% per loop
    entityInstance.damage = Math.ceil(entityInstance.damage * loopMultiplier);
    entityInstance.xp = Math.ceil(
      (entityInstance.xp || 0) * settings.monsterXpMultiplier
    );

    let index;
    let placementValid = false;
    let attempts = 0;

    while (!placementValid && attempts < 200) {
      index = Math.floor(Math.random() * grid.length);
      attempts++;

      // Rule 1: Tile must be empty
      if (grid[index].type !== "hidden") continue;

      const isCenterTile = startAreaIndices.includes(index);
      const isMonsterOrPit = ["monster", "pit", "boss", "eye"].includes(
        entity.type
      );

      // Rule 2: Center tile placement restrictions
      if (isCenterTile) {
        if (entity.type === "boss") {
          // Fail if a boss is already in the center OR the 10% chance fails
          if (centerBossPlaced || Math.random() > 0.1) continue;
        }
        if (entity.type === "pit") {
          // Fail if a pit is already in the center
          if (centerPitPlaced) continue;
        }
      }

      // Rule 3: Don't place monsters/pits next to too many others
      if (isMonsterOrPit) {
        if (countMonsterOrPitNeighbors(index) > 2) continue; // Prevents clumping
      }

      placementValid = true; // All checks passed
    }

    if (placementValid) {
      grid[index] = {
        ...grid[index],
        type: entityInstance.type,
        damage: entityInstance.damage,
        monsterName: entityInstance.name,
      };
      if (entityInstance.type === "eye") hideNumbersAroundEye(index);

      // After successful placement, update flags
      if (startAreaIndices.includes(index)) {
        if (entity.type === "boss") centerBossPlaced = true;
        if (entity.type === "pit") centerPitPlaced = true;
      }
    }
  });

  // Place Potions
  const potionCount = settings.potionCount;
  let placedPotions = 0;
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
      runStats.monstersKilled++;
      userProfile.totalKills = (userProfile.totalKills || 0) + 1;
      saveProfile();
    
      // --- NEW: Monster Kill Log Logic ---
      const monsterName = monsterData.name;
      if (!userProfile.monsterKillLog[monsterName]) {
        userProfile.monsterKillLog[monsterName] = 0;
      }
      userProfile.monsterKillLog[monsterName]++;
      // --- End of New Logic ---

      saveProfile();

      showFloatingStatText(
        `-${damageTaken}`,
        document.getElementById("health-display"),
        "text-red-400"
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
  // --- Existing Stats (Games Won, Kills, Level) ---
  const statsList = document.getElementById("profile-stats-list");
  statsList.innerHTML = `
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-green-400">${userProfile.wins}</div><div class="text-sm text-slate-400">Games Won</div></div>
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-red-400">${userProfile.losses}</div><div class="text-sm text-slate-400">Games Lost</div></div>
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-purple-400">${userProfile.level}</div><div class="text-sm text-slate-400">Current Level</div></div>
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-slate-300">${(userProfile.totalTimePlayed / 3600).toFixed(1)}h</div><div class="text-sm text-slate-400">Time Played</div></div>
  `;

  // --- NEW: Records (Fastest Win, Highest Loop) ---
  const recordsList = document.getElementById("records-stats-list");
  const fastestWinTime = userProfile.fastestWin ? `${userProfile.fastestWin.toFixed(1)}s` : "N/A";
  recordsList.innerHTML = `
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-yellow-400">${fastestWinTime}</div><div class="text-sm text-slate-400">Fastest Win</div></div>
    <div class="bg-slate-900/50 p-3 rounded-lg"><div class="text-2xl font-bold text-sky-400">${userProfile.highestLoop}</div><div class="text-sm text-slate-400">Highest Loop</div></div>
  `;

  // --- NEW: Monster Kill Log ---
  const killLogList = document.getElementById("monster-kill-log-list");
  killLogList.innerHTML = ""; // Clear old list
  if (Object.keys(userProfile.monsterKillLog).length === 0) {
    killLogList.innerHTML = `<span class="text-slate-500 col-span-full text-center">No monsters slayed yet.</span>`;
  } else {
    for (const monsterName in userProfile.monsterKillLog) {
      const count = userProfile.monsterKillLog[monsterName];
      killLogList.innerHTML += `<span class="text-slate-400">${monsterName}:</span><span class="font-semibold text-white">${count}</span>`;
    }
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
  if (gameOverContainer.classList.contains("visible") && title !== "Welcome!") return;

  // --- Don't update stats for the initial welcome screen ---
  const isRealGameEnd = runStats && title !== "Welcome!";

  if (isRealGameEnd) {
    const timePlayed = (Date.now() - runStats.startTime) / 1000; // time in seconds

    // 1. Games Played / Lost
    userProfile.gamesPlayed++;
    if (!isWin) {
      userProfile.losses++;
    }

    // 2. Total Time Played
    userProfile.totalTimePlayed += timePlayed;

    // 3. Highest Loop Reached
    if (runStats.loop > userProfile.highestLoop) {
      userProfile.highestLoop = runStats.loop;
    }
  }

  // --- Save Profile ---
  if (isWin && title !== "Welcome!") {
    userProfile.wins = (userProfile.wins || 0) + 1;

    if (isRealGameEnd) {
      const timePlayed = (Date.now() - runStats.startTime) / 1000;

      // 4. Wins by Difficulty
      if (currentDifficulty) {
        userProfile.winsByDifficulty[currentDifficulty]++;
      }

      // 5. Fastest Win
      if (userProfile.fastestWin === null || timePlayed < userProfile.fastestWin) {
        userProfile.fastestWin = timePlayed;
      }
    }
  }
  saveProfile();

  // --- Render Run Stats ---
  const statsContainer = document.getElementById("run-stats-container");
  if (statsContainer) {
    statsContainer.remove();
  }
  // Only display stats if a run has actually happened
  if (runStats) {
    const newStatsContainer = document.createElement("div");
    newStatsContainer.id = "run-stats-container";
    newStatsContainer.className =
      "text-left bg-slate-900/50 p-4 rounded-lg border border-slate-700";
    const timePlayed = ((Date.now() - runStats.startTime) / 1000).toFixed(1);
    newStatsContainer.innerHTML = `
        <h3 class="text-lg font-bold text-sky-400 mb-2">Run Summary (Loop ${
          runStats.loop
        })</h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span class="text-slate-400">Time Played:</span><span class="text-white font-semibold">${timePlayed}s</span>
            <span class="text-slate-400">Monsters Slain:</span><span class="text-white font-semibold">${
              runStats.monstersKilled
            }</span>
            <span class="text-slate-400">Damage Taken:</span><span class="text-white font-semibold">${
              runStats.damageTaken
            }</span>
        </div>
    `;
    const optionsContainer = document.getElementById("new-game-options");
    popupEl.insertBefore(newStatsContainer, optionsContainer);
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

function openEndGamePopup() {
  gameOverContainer.classList.remove("invisible", "opacity-0");
  popupEl.classList.remove("scale-95");
  gridEl.classList.add("filter", "brightness-[.4]");
  showSummaryBtn.classList.add("hidden");
}

function closeEndGamePopup(isNewGame = false) {
  gameOverContainer.classList.remove("visible", "opacity-100");
  gameOverContainer.classList.add("invisible", "opacity-0");
  popupEl.classList.remove("scale-100");
  popupEl.classList.add("scale-95");
  gridEl.classList.remove("filter", "brightness-[.4]");
  if (!isNewGame) {
    showSummaryBtn.classList.remove("hidden");
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



function loadProfile() {
  const savedProfile = localStorage.getItem("lostDogsProfile");
  if (savedProfile) {
    userProfile = JSON.parse(savedProfile);

    // --- Add default values for backward compatibility ---
    if (userProfile.level === undefined) userProfile.level = 1;
    if (userProfile.xp === undefined) userProfile.xp = 0;
    if (userProfile.gamesPlayed === undefined) userProfile.gamesPlayed = 0;
    if (userProfile.losses === undefined) userProfile.losses = 0;
    if (userProfile.totalTimePlayed === undefined) userProfile.totalTimePlayed = 0;
    if (userProfile.winsByDifficulty === undefined) {
      userProfile.winsByDifficulty = { easy: 0, normal: 0, hard: 0 };
    }
    if (userProfile.monsterKillLog === undefined) userProfile.monsterKillLog = {};
    if (userProfile.highestLoop === undefined) userProfile.highestLoop = 1;
    if (userProfile.fastestWin === undefined) userProfile.fastestWin = null;

  } else {
    // Default profile for a brand new user
    userProfile = {
      wins: 0,
      totalKills: 0,
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      losses: 0,
      totalTimePlayed: 0, // in seconds
      winsByDifficulty: { easy: 0, normal: 0, hard: 0 },
      monsterKillLog: {},
      highestLoop: 1,
      fastestWin: null, // stored in seconds
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
showSummaryBtn.addEventListener("click", openEndGamePopup);
gameOverContainer.addEventListener("click", (e) => {
  // If it's the initial launch, do not close the popup by clicking outside
  if (isInitialLaunch) {
    return;
  }
  // Otherwise, allow closing it
  if (e.target === gameOverContainer) {
    closeEndGamePopup();
  }
});

window.addEventListener("resize", resizeGrid);

profileBtn.addEventListener("click", openProfileModal);
closeProfileModalBtn.addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) closeProfileModal();
});


// Initial load
loadProfile();
endGame("Welcome!", true);

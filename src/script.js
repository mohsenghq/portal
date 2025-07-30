const gridSizeX = 7;
const gridSizeY = 11;
const centerX = Math.floor(gridSizeX / 2);
const centerY = Math.floor(gridSizeY / 2);
let health, maxHealth, isFlagMode, defeatedBossesCount;

const grid = [];
const BOSSES = [
    { name: "Light Mage", damage: 6, amount: 1, type: 'boss' },
    { name: "Dark Mage", damage: 10, amount: 1, type: 'boss' },
    { name: "Golem", damage: 15, amount: 1, type: 'boss' },
];
const MONSTERS = [
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
const ALL_ENTITIES = [...BOSSES, ...MONSTERS];

// DOM Elements
const healthValueEl = document.getElementById('health-value');
const maxHealthEl = document.getElementById('max-health');
const gridEl = document.getElementById('grid');
const newGameBtn = document.getElementById('new-game-btn');
const newGameFooterBtn = document.getElementById('new-game-footer-btn');
const bossNameEl = document.getElementById('boss-name');
const bossProgressEl = document.getElementById('boss-progress');
const monsterInfoPanel = document.getElementById('monster-info-panel');
const gridWrapper = document.getElementById('grid-wrapper');
const gameOverContainer = document.getElementById('game-over-container');
const popupEl = document.getElementById('popup');
const popupTitleEl = document.getElementById('popup-title');
const flagModeBtn = document.getElementById('flag-mode-btn');
const monsterPanelBtn = document.getElementById('monster-panel-btn');
const mobileMonsterPopup = document.getElementById('mobile-monster-popup');
const mobilePopupContent = mobileMonsterPopup.querySelector('.popup-content');
const closeMonsterPopup = document.getElementById('close-monster-popup');
const mobileMonsterList = document.getElementById('mobile-monster-list');
const headerTextEl = document.getElementById('header-text');

// --- Game Initialization & State ---

function initializeGrid() {
    health = 6; maxHealth = 6; defeatedBossesCount = 0;
    gridEl.innerHTML = ''; grid.length = 0;
    gridEl.style.pointerEvents = 'auto';
    gridEl.classList.remove('filter', 'brightness-[.4]');
    if(headerTextEl) headerTextEl.style.display = 'inline';
    
    closeEndGamePopup(true); // Close popup without showing footer button
    newGameFooterBtn.classList.add('hidden');
    isFlagMode = false;
    flagModeBtn.classList.remove('bg-sky-500/50');

    // Create Tiles
    for (let i = 0; i < gridSizeX * gridSizeY; i++) {
        const tileEl = document.createElement('div');
        tileEl.addEventListener('click', () => handleTileClick(i));
        gridEl.appendChild(tileEl);
        grid.push({
            type: 'hidden', value: 0, damage: 0, flagged: false, revealed: false,
            hasPotion: false, potionUsed: false, monsterName: null, isDefeated: false,
            isHiddenByEye: false,
        });
    }
    
    placeElements();
    updateNumbers();
    
    // Reveal center area
    for (let j = centerY - 1; j <= centerY + 1; j++) {
        for (let i = centerX - 1; i <= centerX + 1; i++) {
            const index = j * gridSizeX + i;
            if (grid[index]) {
                grid[index].revealed = true;
                if (grid[index].type === 'hidden') {
                    grid[index].type = 'empty';
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

function placeElements() {
    const startAreaIndices = Array.from({ length: 9 }, (_, i) => (centerY - 1 + Math.floor(i / 3)) * gridSizeX + (centerX - 1 + (i % 3)));
    
    const placeEntity = (entity, count) => {
        for (let i = 0; i < count; i++) {
            let index;
            do {
                index = Math.floor(Math.random() * grid.length);
            } while (grid[index].type !== 'hidden' || (entity.type === 'eye' && startAreaIndices.includes(index)));
            grid[index] = { ...grid[index], type: entity.type, damage: entity.damage, monsterName: entity.name };
            if (entity.type === 'eye') hideNumbersAroundEye(index);
        }
    };
    
    ALL_ENTITIES.forEach(m => placeEntity(m, m.amount));

    // Place Potions
    const potionCount = 12;
    const guaranteedPotions = 2;
    let placedPotions = 0;
    const safeStartTiles = startAreaIndices.filter(index => grid[index].type === 'hidden');
    
    for (let i = 0; i < guaranteedPotions && safeStartTiles.length > 0; i++) {
        const randIndex = Math.floor(Math.random() * safeStartTiles.length);
        const tileIndex = safeStartTiles.splice(randIndex, 1)[0];
        grid[tileIndex].hasPotion = true;
        grid[tileIndex].type = 'empty';
        placedPotions++;
    }

    while (placedPotions < potionCount) {
        let index = Math.floor(Math.random() * grid.length);
        if (grid[index].type === 'hidden') {
            grid[index].hasPotion = true;
            grid[index].type = 'empty';
            placedPotions++;
        }
    }
}


// --- Core Game Logic ---

function handleTileClick(index) {
    const tile = grid[index];
    if (tile.isDefeated || tile.potionUsed || (tile.flagged && !isFlagMode)) return;

    if (isFlagMode) {
        if (!tile.revealed) {
            tile.flagged = !tile.flagged;
            updateTileDisplay(index);
        }
        return;
    }

    let needsUpdate = { numbers: false, panel: false };

    if (!tile.revealed) {
        tile.revealed = true;
        if (tile.type === 'hidden') tile.type = 'empty';
        if (tile.hasPotion) {
            updateTileDisplay(index);
            return;
        }
    } else if (tile.hasPotion) {
        health = maxHealth;
        tile.potionUsed = true;
        showFloatingText("Health Restored!", index, false);
        updateDisplay();
        updateTileDisplay(index);
        return;
    }

    if (['monster', 'eye', 'pit', 'boss'].includes(tile.type)) {
        if (tile.type === 'boss' && tile.damage > health) {
            health -= tile.damage;
            showFloatingText(`-${tile.damage} HP`, index, true);
            endGame("You Died...", false);
        } else {
            health -= tile.damage;
            tile.isDefeated = true;
            needsUpdate.panel = true;
            if(tile.type !== 'pit') showFloatingText(`-${tile.damage} HP`, index, true);

            if(tile.type === 'eye') {
                revealNumbersAroundEye(index);
            }
            needsUpdate.numbers = true;

            if (tile.type === 'boss') {
                defeatedBossesCount++;
                if (tile.monsterName === 'Light Mage') { maxHealth += 4; health = maxHealth; showFloatingText("Max Health +4", index); }
                if (tile.monsterName === 'Dark Mage') { maxHealth += 5; health = maxHealth; showFloatingText("Max Health +5", index); }
            }
        }
    }

    if (needsUpdate.numbers) updateNumbers();
    if (needsUpdate.panel) updateMonsterInfoPanel();

    updateDisplay();
    grid.forEach((_, i) => updateTileDisplay(i));

    if (health < 0) {
        endGame("You Died...", false);
    } else if (tile.monsterName === 'Golem' && tile.isDefeated) {
        endGame('You Win!', true);
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
                    if (['monster', 'pit', 'boss', 'eye'].includes(neighbor.type) && !neighbor.isDefeated) {
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
    tileEl.innerHTML = '';
    
    // Base classes for all tiles
    const baseClasses = ['relative', 'aspect-square', 'flex', 'items-center', 'justify-center', 'cursor-pointer', 'rounded-sm', 'transition-all', 'duration-200', 'font-bold', 'text-base', 'select-none'];
    tileEl.className = baseClasses.join(' ');

    if (tile.flagged) {
        tileEl.classList.add('bg-slate-500');
        tileEl.innerHTML = `<div class="w-4/5 h-4/5 bg-contain bg-center bg-no-repeat" style="background-image: url('icons/flag.png');"></div>`;
        return;
    }

    if (!tile.revealed) {
        tileEl.classList.add('bg-slate-500', 'hover:bg-slate-400');
        return;
    }

    // --- REVEALED TILE STYLES ---
    tileEl.classList.add('bg-slate-700');
    
    const isMonster = ['monster', 'boss', 'eye', 'pit'].includes(tile.type);

    if (isMonster) {
        const iconClass = tile.type === 'pit' ? 'pit' : tile.monsterName.replace(/\s+/g, '-');
        const positionClass = tile.type === 'pit' ? 'w-4/5 h-4/5' : 'absolute top-0 w-3/5 h-3/5';
        const opacityClass = tile.isDefeated ? 'opacity-30' : '';

        const iconDiv = `<div class="${positionClass} ${iconClass} bg-contain bg-no-repeat bg-center ${opacityClass} transition-opacity"></div>`;
        const damageDiv = tile.type !== 'pit' ? `<span class="absolute bottom-0 text-yellow-400 font-bold text-sm ${opacityClass}">${tile.damage}</span>` : '';
        const valueDiv = tile.isDefeated && tile.value >= 0 ? `<span class="text-white text-base" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.7)">${tile.isHiddenByEye ? '?' : tile.value}</span>` : '';

        
        tileEl.innerHTML = `${iconDiv}${damageDiv}${valueDiv}`;

    } else if (tile.type === 'empty') {
        if (tile.hasPotion) {
            if (tile.potionUsed) {
                // MODIFIED: Faded icon in center, opaque number on top
                const potionIcon = `<div class="potion-icon absolute inset-0 opacity-30"></div>`;
                const valueText = tile.value >= 0 ? `<span class="relative z-10 text-white text-base">${tile.isHiddenByEye ? '?' : tile.value}</span>` : '';
                tileEl.innerHTML = `${potionIcon}${valueText}`;
            } else {
                // Unused Potion: Icon at top, value at bottom
                const potionIcon = `<div class="potion-icon absolute top-0 w-[65%] h-[65%]"></div>`;
                const valueText = tile.value >= 0 ? `<span class="absolute bottom-0 text-xs text-white">${tile.isHiddenByEye ? '?' : tile.value}</span>` : '';
                tileEl.innerHTML = `${potionIcon}${valueText}`;
            }
        } else {
            // No potion, just the number
            if(tile.value >= 0) tileEl.innerHTML = `<span class="text-white text-base">${tile.isHiddenByEye ? '?' : tile.value}</span>`;
        }
    }
}

function updateMonsterInfoPanel() {
    const allMonsterTypes = [...BOSSES, ...MONSTERS.filter(m => m.type !== 'pit')];
    const generateHtml = (monster) => {
        const remaining = grid.filter(tile => tile.monsterName === monster.name && !tile.isDefeated).length;
        const isCleared = remaining === 0;
        const iconClass = monster.name.replace(/\s+/g, '-');
        return `
            <div class="monster-entry flex items-center gap-2 p-1.5 bg-slate-700 rounded-md border border-slate-600 transition-all duration-300 ${isCleared ? 'opacity-50 grayscale' : ''}">
                <div class="icon w-6 h-6 bg-contain bg-no-repeat bg-center ${iconClass}"></div>
                <div class="details flex flex-col flex-grow">
                    <span class="name font-bold text-sm text-slate-100">${monster.name}</span>
                    <span class="stats text-xs text-slate-400">Dmg: ${monster.damage}</span>
                </div>
                <div class="count text-base font-bold ${isCleared ? 'text-slate-500' : 'text-sky-400'}">${remaining}/${monster.amount}</div>
            </div>
        `;
    };
    const panelHtml = allMonsterTypes.map(generateHtml).join('');
    monsterInfoPanel.innerHTML = panelHtml;
    // Mobile list uses a different class structure for now, can be updated if needed
    mobileMonsterList.innerHTML = panelHtml.replaceAll('p-1.5', 'p-2.5').replaceAll('w-6 h-6', 'w-8 h-8');
}


function updateDisplay() {
    healthValueEl.innerText = Math.max(0, health);
    maxHealthEl.innerText = maxHealth;
    const currentBoss = BOSSES[defeatedBossesCount];
    if (currentBoss) {
        if(headerTextEl) headerTextEl.style.display = 'inline'; // Add this line
        bossNameEl.innerText = currentBoss.name;
        bossProgressEl.innerText = `(${defeatedBossesCount}/3)`;
    } else {
        if(headerTextEl) headerTextEl.style.display = 'none'; // Add this line
        bossNameEl.innerText = "All Bosses Cleared!";
        bossProgressEl.innerText = `(3/3)`;
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
        if ((maxWidth / maxHeight) > (gridSizeX / gridSizeY)) {
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
    if (!gameOverContainer.classList.contains('visible')) {
        gridEl.style.pointerEvents = 'none';
        gridEl.classList.add('filter', 'brightness-[.4]');
        
        popupTitleEl.innerText = title;
        popupTitleEl.className = `text-4xl font-extrabold ${isWin ? 'text-green-400' : 'text-red-500'}`;
        
        gameOverContainer.classList.remove('invisible', 'opacity-0');
        gameOverContainer.classList.add('visible', 'opacity-100');
        popupEl.classList.remove('scale-95');
        popupEl.classList.add('scale-100');
    }
}

function closeEndGamePopup(isNewGame = false) {
    gameOverContainer.classList.remove('visible', 'opacity-100');
    gameOverContainer.classList.add('invisible', 'opacity-0');
    popupEl.classList.remove('scale-100');
    popupEl.classList.add('scale-95');
    gridEl.classList.remove('brightness-[.4]');
    if (!isNewGame) {
        newGameFooterBtn.classList.remove('hidden');
    }
}

function showMobileMonsterPanel() {
    mobileMonsterPopup.classList.remove('invisible', 'opacity-0');
    mobileMonsterPopup.classList.add('visible', 'opacity-100');
    mobilePopupContent.classList.remove('scale-95');
    mobilePopupContent.classList.add('scale-100');
}

function hideMobileMonsterPanel() {
    mobileMonsterPopup.classList.remove('visible', 'opacity-100');
    mobileMonsterPopup.classList.add('invisible', 'opacity-0');
    mobilePopupContent.classList.remove('scale-100');
    mobilePopupContent.classList.add('scale-95');
}

function showFloatingText(text, tileIndex, isDamage = false) {
    const textEl = document.createElement('div');
    textEl.innerText = text;
    textEl.className = `absolute text-xl font-bold pointer-events-none z-[100] transition-all duration-[2s] ease-out`;
    textEl.style.color = isDamage ? '#f87171' : '#4ade80'; // red-400 or green-400
    textEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';

    const tileRect = gridEl.children[tileIndex].getBoundingClientRect();
    const gridRect = gridWrapper.getBoundingClientRect();
    
    textEl.style.left = `${tileRect.left - gridRect.left + tileRect.width / 2}px`;
    textEl.style.top = `${tileRect.top - gridRect.top + tileRect.height / 2}px`;
    textEl.style.transform = 'translate(-50%, -50%)';
    
    gridWrapper.appendChild(textEl);
    
    requestAnimationFrame(() => {
        textEl.style.opacity = '0';
        textEl.style.transform = 'translate(-50%, -200%)';
    });
    
    setTimeout(() => textEl.remove(), 2000);
}

// --- Utility Functions ---
function hideNumbersAroundEye(eyeIndex){const y=Math.floor(eyeIndex/gridSizeX),x=eyeIndex%gridSizeX;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&nx<gridSizeX&&ny>=0&&ny<gridSizeY)grid[ny*gridSizeX+nx].isHiddenByEye=true;}}
function revealNumbersAroundEye(eyeIndex){const y=Math.floor(eyeIndex/gridSizeX),x=eyeIndex%gridSizeX;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&nx<gridSizeX&&ny>=0&&ny<gridSizeY)grid[ny*gridSizeX+nx].isHiddenByEye=false;}}


// --- Event Listeners ---
newGameBtn.addEventListener('click', initializeGrid);
newGameFooterBtn.addEventListener('click', initializeGrid);

flagModeBtn.addEventListener('click', () => {
    isFlagMode = !isFlagMode;
    flagModeBtn.classList.toggle('bg-sky-500/50', isFlagMode);
});

monsterPanelBtn.addEventListener('click', showMobileMonsterPanel);
closeMonsterPopup.addEventListener('click', hideMobileMonsterPanel);

mobileMonsterPopup.addEventListener('click', (e) => {
    if (e.target === mobileMonsterPopup) hideMobileMonsterPanel();
});
gameOverContainer.addEventListener('click', (e) => {
    if (e.target === gameOverContainer) closeEndGamePopup();
});

window.addEventListener('resize', resizeGrid);

// Initial load
initializeGrid();
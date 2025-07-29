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

const healthValueEl = document.getElementById('health-value');
const maxHealthEl = document.getElementById('max-health');
const gridEl = document.getElementById('grid');
const newGameBtn = document.getElementById('new-game-btn');
const bossNameEl = document.getElementById('boss-name');
const bossProgressEl = document.getElementById('boss-progress');
const monsterInfoPanel = document.getElementById('monster-info-panel');
const gridWrapper = document.getElementById('grid-wrapper');
const gameOverContainer = document.getElementById('game-over-container');
const popupTitleEl = document.getElementById('popup-title');
const monsterPanelBtn = document.getElementById('monster-panel-btn');
const mobileMonsterPopup = document.getElementById('mobile-monster-popup');
const closeMonsterPopup = document.getElementById('close-monster-popup');
const mobileMonsterList = document.getElementById('mobile-monster-list');

function initializeGrid() {
    health = 6; maxHealth = 6; defeatedBossesCount = 0;
    gridEl.innerHTML = ''; grid.length = 0;
    gridEl.style.pointerEvents = 'auto';
    gridEl.classList.remove('dimmed');
    gameOverContainer.classList.add('hidden');
    isFlagMode = false;
    document.getElementById('flag-mode-btn').classList.remove('active');

    for (let i = 0; i < gridSizeX * gridSizeY; i++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'tile hidden';
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
    
    // Reveal the center 9 tiles. If they are hidden by an eye, that property will persist.
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
    updateMonsterInfoPanel();
    grid.forEach((_, index) => updateTileDisplay(index));
    updateDisplay();
}

function placeElements() {
    const startAreaIndices = [];
    for (let j = centerY - 1; j <= centerY + 1; j++) {
        for (let i = centerX - 1; i <= centerX + 1; i++) startAreaIndices.push(j * gridSizeX + i);
    }
    
    const eye = ALL_ENTITIES.find(m => m.type === 'eye');
    let eyeIndex;
    do { eyeIndex = Math.floor(Math.random() * grid.length); } while (startAreaIndices.includes(eyeIndex));
    grid[eyeIndex].type = 'eye';
    grid[eyeIndex].damage = eye.damage;
    grid[eyeIndex].monsterName = eye.name;
    hideNumbersAroundEye(eyeIndex);

    ALL_ENTITIES.filter(m => m.type !== 'eye').forEach(m => {
        for (let i = 0; i < m.amount; i++) {
            let index;
            do { index = Math.floor(Math.random() * grid.length); } while (grid[index].type !== 'hidden');
            grid[index].type = m.type;
            grid[index].damage = m.damage;
            grid[index].monsterName = m.name;
        }
    });

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


function handleTileClick(index) {
    const tile = grid[index];
    if (isFlagMode) {
        if (!tile.revealed) {
            tile.flagged = !tile.flagged;
            updateTileDisplay(index);
        }
        return;
    }
    // Prevent action on already defeated/used/flagged tiles
    if (tile.isDefeated || tile.potionUsed || tile.flagged) return;

    let numbersNeedUpdating = false;
    let monsterPanelNeedsUpdating = false;

    // Mark the tile as revealed on any valid click.
    tile.revealed = true;
    if (tile.type === 'hidden') tile.type = 'empty'; // Uncover a blank tile

    const isActionable = ['monster', 'eye', 'pit', 'boss'].includes(tile.type);

    if (isActionable) {
        const isBoss = tile.type === 'boss';
        if (isBoss && tile.damage > health) {
            health -= tile.damage;
            showFloatingText(`-${tile.damage} HP`, index, true);
            updateDisplay();
            updateTileDisplay(index);
            endGame("You Lose!", false);
            return;
        }

        health -= tile.damage;
        tile.isDefeated = true;
        numbersNeedUpdating = true;
        monsterPanelNeedsUpdating = true;
        if (tile.type !== 'pit') showFloatingText(`-${tile.damage} HP`, index, true);

        if (tile.type === 'eye') {
            revealNumbersAroundEye(index);
            // After revealing, we need to redraw all tiles to show their real values
            numbersNeedUpdating = true; // Force number update
        }

        if (isBoss) {
            defeatedBossesCount++;
            if (tile.monsterName === 'Light Mage') { maxHealth += 4; health = maxHealth; showFloatingText("Max Health +4", index); }
            if (tile.monsterName === 'Dark Mage') { maxHealth += 5; health = maxHealth; showFloatingText("Max Health +5", index); }
        }
    } else if (tile.hasPotion) {
        // Consume potion on click
        health = maxHealth;
        tile.potionUsed = true;
        showFloatingText("Health Restored!", index);
    }

    if (numbersNeedUpdating) {
        updateNumbers();
    }
    if (monsterPanelNeedsUpdating) {
        updateMonsterInfoPanel();
    }

    updateDisplay();
    // Full grid redraw is necessary to handle changes around the Eye
    grid.forEach((_, i) => updateTileDisplay(i));

    if (health < 0) {
        if (gameOverContainer.classList.contains('hidden')) {
            endGame("You Lose!", false);
        }
    } else if (tile.monsterName === 'Golem' && tile.isDefeated) {
        endGame('You Win!', true);
    }
}


function updateTileDisplay(index) {
    const tileEl = gridEl.children[index];
    const tile = grid[index];
    tileEl.innerHTML = '';
    tileEl.className = 'tile';

    if (tile.flagged) {
        tileEl.classList.add('flagged');
        return;
    }

    if (!tile.revealed) {
        tileEl.classList.add('hidden');
        return;
    }

    // ALL LOGIC BELOW THIS POINT IS FOR REVEALED TILES
    const isMonsterTile = ['monster', 'boss', 'eye', 'pit'].includes(tile.type);

    if (isMonsterTile) {
        tileEl.classList.add('empty');
        const iconClass = tile.type === 'pit' ? 'pit' : tile.monsterName.replace(/\s+/g, '-');
        const positionClass = tile.type === 'pit' ? 'icon-center' : 'icon-top';
        const iconDiv = document.createElement('div');
        iconDiv.className = `${positionClass} ${iconClass}`;

        if (tile.isDefeated) {
            iconDiv.classList.add('low-opacity');
            tileEl.appendChild(iconDiv);
            
            if (tile.type !== 'pit') {
                const damageBottom = document.createElement('span');
                damageBottom.className = 'damage value-bottom low-opacity';
                damageBottom.innerText = tile.damage;
                tileEl.appendChild(damageBottom);
            }

            if (tile.value >= 0) {
                const valueCenter = document.createElement('span');
                valueCenter.className = 'value value-center';
                valueCenter.style.fontSize = '1em';
                valueCenter.innerText = tile.isHiddenByEye ? '?' : tile.value;
                tileEl.appendChild(valueCenter);
            }
        } else {
            tileEl.appendChild(iconDiv);
            if (tile.type !== 'pit') {
                const damageSpan = document.createElement('span');
                damageSpan.className = 'damage value-bottom';
                damageSpan.innerText = tile.damage;
                tileEl.appendChild(damageSpan);
            }
        }
    } else if (tile.type === 'empty') {
        tileEl.classList.add('empty');
        if (tile.hasPotion) {
            if (tile.potionUsed) {
                if (tile.value >= 0) {
                    const valueCenter = document.createElement('span');
                    valueCenter.className = 'value value-center';
                    valueCenter.innerText = tile.isHiddenByEye ? '?' : tile.value;
                    tileEl.appendChild(valueCenter);
                }
            } else {
                const potionIcon = document.createElement('div');
                potionIcon.className = 'potion-icon-display';
                tileEl.appendChild(potionIcon);
                if (tile.value >= 0) { 
                    const valueBottom = document.createElement('span');
                    valueBottom.className = 'value value-bottom';
                    valueBottom.innerText = tile.isHiddenByEye ? '?' : tile.value;
                    tileEl.appendChild(valueBottom);
                }
            }
        } else {
             if (tile.value >= 0) { 
                const valueSpan = document.createElement('span');
                valueSpan.className = 'value';
                valueSpan.innerText = tile.isHiddenByEye ? '?' : tile.value;
                tileEl.appendChild(valueSpan);
            }
        }
    }
}

function showFloatingText(text, tileIndex, isDamage = false) {
    const textEl = document.createElement('div');
    textEl.className = 'floating-text';
    textEl.innerText = text;
    if (isDamage) {
        textEl.style.color = '#f56565';
    } else {
        textEl.style.color = '#48bb78';
    }

    if (tileIndex >= 0) {
        const gridRect = gridEl.getBoundingClientRect();
        const tileSize = gridRect.width / gridSizeX;
        const y = Math.floor(tileIndex / gridSizeX);
        const x = tileIndex % gridSizeX;
        textEl.style.top = `${y * tileSize + tileSize/2}px`; 
        textEl.style.left = `${x * tileSize + tileSize/2}px`;
        textEl.style.transform = 'translateX(-50%)';
    } else {
        textEl.style.top = '50%';
        textEl.style.left = '50%';
        textEl.style.transform = 'translate(-50%, -50%)';
    }

    gridWrapper.appendChild(textEl);
    setTimeout(() => {
        textEl.remove();
    }, 1900);
}


function updateMonsterInfoPanel() {
    // Update desktop panel
    monsterInfoPanel.innerHTML = '';
    const allMonsterTypes = [...BOSSES, ...MONSTERS.filter(m => m.type !== 'pit')];

    allMonsterTypes.forEach(monster => {
        const remaining = grid.filter(tile => tile.monsterName === monster.name && !tile.isDefeated).length;
        const entry = document.createElement('div');
        entry.className = 'monster-entry';
        if (remaining === 0) {
            entry.classList.add('cleared');
        }
        
        const iconClass = monster.name.replace(/\s+/g, '-');
        entry.innerHTML = `
            <div class="icon ${iconClass}"></div>
            <div class="details">
                <span class="name">${monster.name}</span>
                <span class="stats">Dmg: ${monster.damage}</span>
            </div>
            <div class="count">${remaining}/${monster.amount}</div>
        `;
        monsterInfoPanel.appendChild(entry);
    });
    
    // Also update mobile list if popup is open
    if (mobileMonsterPopup && !mobileMonsterPopup.classList.contains('hidden')) {
        updateMobileMonsterList();
    }
}


function endGame(title, isWin) {
    gridEl.style.pointerEvents = 'none';
    gridEl.classList.add('dimmed');

    popupTitleEl.innerText = title;
    popupTitleEl.style.color = isWin ? '#48bb78' : '#f56565';
    
    gameOverContainer.classList.remove('hidden');
}

function showMobileMonsterPanel() {
    updateMobileMonsterList();
    mobileMonsterPopup.classList.remove('hidden');
}

function hideMobileMonsterPanel() {
    mobileMonsterPopup.classList.add('hidden');
}

function updateMobileMonsterList() {
    mobileMonsterList.innerHTML = '';
    const allMonsterTypes = [...BOSSES, ...MONSTERS.filter(m => m.type !== 'pit')];

    allMonsterTypes.forEach(monster => {
        const remaining = grid.filter(tile => tile.monsterName === monster.name && !tile.isDefeated).length;
        const entry = document.createElement('div');
        entry.className = 'monster-entry';
        if (remaining === 0) {
            entry.classList.add('cleared');
        }
        
        const iconClass = monster.name.replace(/\s+/g, '-');
        entry.innerHTML = `
            <div class="icon ${iconClass}"></div>
            <div class="details">
                <span class="name">${monster.name}</span>
                <span class="stats">Dmg: ${monster.damage}</span>
            </div>
            <div class="count">${remaining}/${monster.amount}</div>
        `;
        mobileMonsterList.appendChild(entry);
    });
}

function updateNumbers(){for(let o=0;o<grid.length;o++){let t=0;const e=Math.floor(o/gridSizeX),l=o%gridSizeX;for(let a=-1;a<=1;a++)for(let d=-1;d<=1;d++){if(0===d&&0===a)continue;const n=l+d,r=e+a;if(n>=0&&n<gridSizeX&&r>=0&&r<gridSizeY){const g=r*gridSizeX+n,s=grid[g];["monster","pit","boss","eye"].includes(s.type)&&!s.isDefeated&&(t+=s.damage)}}grid[o].value=t}}
function updateDisplay(){healthValueEl.innerText=Math.max(0,health),maxHealthEl.innerText=maxHealth;const o=BOSSES[defeatedBossesCount];o?(bossNameEl.innerText=o.name,bossProgressEl.innerText=`(${defeatedBossesCount}/3)`):(bossNameEl.innerText="Cleared!",bossProgressEl.innerText="(3/3)")}
function hideNumbersAroundEye(o){const t=Math.floor(o/gridSizeX),e=o%gridSizeX;for(let l=-1;l<=1;l++)for(let a=-1;a<=1;a++){if(0===a&&0===l)continue;const d=e+a,n=t+l;d>=0&&d<gridSizeX&&n>=0&&n<gridSizeY&&(grid[n*gridSizeX+d].isHiddenByEye=!0)}}
function revealNumbersAroundEye(o){const t=Math.floor(o/gridSizeX),e=o%gridSizeX;for(let l=-1;l<=1;l++)for(let a=-1;a<=1;a++){if(0===a&&0===l)continue;const d=e+a,n=t+l;d>=0&&d<gridSizeX&&n>=0&&n<gridSizeY&&(grid[n*gridSizeX+d].isHiddenByEye=!1)}}
newGameBtn.addEventListener('click', initializeGrid);
document.getElementById('flag-mode-btn').addEventListener('click', () => {
    isFlagMode = !isFlagMode;
    document.getElementById('flag-mode-btn').classList.toggle('active', isFlagMode);
});
if (monsterPanelBtn) {
    monsterPanelBtn.addEventListener('click', showMobileMonsterPanel);
}

if (closeMonsterPopup) {
    closeMonsterPopup.addEventListener('click', hideMobileMonsterPanel);
}

// Close popup when clicking outside
if (mobileMonsterPopup) {
    mobileMonsterPopup.addEventListener('click', (e) => {
        if (e.target === mobileMonsterPopup) {
            hideMobileMonsterPanel();
        }
    });
}

initializeGrid();

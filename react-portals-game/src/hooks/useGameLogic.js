import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  GRID_SIZE_X, 
  GRID_SIZE_Y, 
  CENTER_X, 
  CENTER_Y, 
  ALL_ENTITIES, 
  BOSSES, 
  INITIAL_HEALTH,
  POTION_COUNT,
  GUARANTEED_POTIONS
} from '../gameConstants';

export const useGameLogic = () => {
  const [grid, setGrid] = useState([]);
  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [maxHealth, setMaxHealth] = useState(INITIAL_HEALTH);
  const [defeatedBossesCount, setDefeatedBossesCount] = useState(0);
  const [isFlagMode, setIsFlagMode] = useState(false);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [floatingTexts, setFloatingTexts] = useState([]);
  const floatingTextIdRef = useRef(0);

  const createEmptyTile = () => ({
    type: 'hidden',
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

  const initializeGrid = useCallback(() => {
    const newGrid = [];
    
    // Create empty grid
    for (let i = 0; i < GRID_SIZE_X * GRID_SIZE_Y; i++) {
      newGrid.push(createEmptyTile());
    }

    // Place entities
    placeElements(newGrid);
    updateNumbers(newGrid);

    // Reveal starting area
    for (let j = CENTER_Y - 1; j <= CENTER_Y + 1; j++) {
      for (let i = CENTER_X - 1; i <= CENTER_X + 1; i++) {
        const index = j * GRID_SIZE_X + i;
        if (newGrid[index]) {
          newGrid[index].revealed = true;
          if (newGrid[index].type === 'hidden') {
            newGrid[index].type = 'empty';
          }
        }
      }
    }

    setGrid(newGrid);
    setHealth(INITIAL_HEALTH);
    setMaxHealth(INITIAL_HEALTH);
    setDefeatedBossesCount(0);
    setIsFlagMode(false);
    setGameState('playing');
    setFloatingTexts([]);
  }, []);

  const placeElements = (grid) => {
    // Get starting area indices
    const startAreaIndices = [];
    for (let j = CENTER_Y - 1; j <= CENTER_Y + 1; j++) {
      for (let i = CENTER_X - 1; i <= CENTER_X + 1; i++) {
        startAreaIndices.push(j * GRID_SIZE_X + i);
      }
    }

    // Place eye first
    const eye = ALL_ENTITIES.find(m => m.type === 'eye');
    let eyeIndex;
    do {
      eyeIndex = Math.floor(Math.random() * grid.length);
    } while (startAreaIndices.includes(eyeIndex));
    
    grid[eyeIndex].type = 'eye';
    grid[eyeIndex].damage = eye.damage;
    grid[eyeIndex].monsterName = eye.name;
    hideNumbersAroundEye(grid, eyeIndex);

    // Place other entities
    ALL_ENTITIES.filter(m => m.type !== 'eye').forEach(monster => {
      for (let i = 0; i < monster.amount; i++) {
        let index;
        do {
          index = Math.floor(Math.random() * grid.length);
        } while (grid[index].type !== 'hidden');
        
        grid[index].type = monster.type;
        grid[index].damage = monster.damage;
        grid[index].monsterName = monster.name;
      }
    });

    // Place potions
    let placedPotions = 0;
    const safeStartTiles = startAreaIndices.filter(index => grid[index].type === 'hidden');
    
    // Place guaranteed potions in starting area
    for (let i = 0; i < GUARANTEED_POTIONS && safeStartTiles.length > 0; i++) {
      const randIndex = Math.floor(Math.random() * safeStartTiles.length);
      const tileIndex = safeStartTiles.splice(randIndex, 1)[0];
      grid[tileIndex].hasPotion = true;
      grid[tileIndex].type = 'empty';
      placedPotions++;
    }

    // Place remaining potions
    while (placedPotions < POTION_COUNT) {
      const index = Math.floor(Math.random() * grid.length);
      if (grid[index].type === 'hidden') {
        grid[index].hasPotion = true;
        grid[index].type = 'empty';
        placedPotions++;
      }
    }
  };

  const hideNumbersAroundEye = (grid, eyeIndex) => {
    const eyeY = Math.floor(eyeIndex / GRID_SIZE_X);
    const eyeX = eyeIndex % GRID_SIZE_X;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const newX = eyeX + dx;
        const newY = eyeY + dy;
        
        if (newX >= 0 && newX < GRID_SIZE_X && newY >= 0 && newY < GRID_SIZE_Y) {
          const neighborIndex = newY * GRID_SIZE_X + newX;
          grid[neighborIndex].isHiddenByEye = true;
        }
      }
    }
  };

  const revealNumbersAroundEye = (grid, eyeIndex) => {
    const eyeY = Math.floor(eyeIndex / GRID_SIZE_X);
    const eyeX = eyeIndex % GRID_SIZE_X;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const newX = eyeX + dx;
        const newY = eyeY + dy;
        
        if (newX >= 0 && newX < GRID_SIZE_X && newY >= 0 && newY < GRID_SIZE_Y) {
          const neighborIndex = newY * GRID_SIZE_X + newX;
          grid[neighborIndex].isHiddenByEye = false;
        }
      }
    }
  };

  const updateNumbers = (grid) => {
    for (let i = 0; i < grid.length; i++) {
      let totalDamage = 0;
      const y = Math.floor(i / GRID_SIZE_X);
      const x = i % GRID_SIZE_X;
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = x + dx;
          const newY = y + dy;
          
          if (newX >= 0 && newX < GRID_SIZE_X && newY >= 0 && newY < GRID_SIZE_Y) {
            const neighborIndex = newY * GRID_SIZE_X + newX;
            const neighbor = grid[neighborIndex];
            
            if (['monster', 'pit', 'boss', 'eye'].includes(neighbor.type) && !neighbor.isDefeated) {
              totalDamage += neighbor.damage;
            }
          }
        }
      }
      
      grid[i].value = totalDamage;
    }
  };

  const showFloatingText = useCallback((text, tileIndex, isDamage = false) => {
    const id = floatingTextIdRef.current++;
    const y = Math.floor(tileIndex / GRID_SIZE_X);
    const x = tileIndex % GRID_SIZE_X;
    
    const newFloatingText = {
      id,
      text,
      x: x * 44 + 22,
      y: y * 44 + 22,
      isDamage
    };
    
    setFloatingTexts(prev => [...prev, newFloatingText]);
    
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1900);
  }, []);

  const handleTileClick = useCallback((index) => {
    if (gameState !== 'playing') return;
    
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      const tile = newGrid[index];
      
      if (isFlagMode) {
        if (!tile.revealed) {
          tile.flagged = !tile.flagged;
        }
        return newGrid;
      }
      
      if (tile.isDefeated || tile.potionUsed || tile.flagged) {
        return newGrid;
      }

      let needsNumberUpdate = false;
      
      if (tile.revealed && tile.hasPotion) {
        // Use potion
        setHealth(maxHealth);
        tile.potionUsed = true;
        showFloatingText("Health Restored!", index);
      } else {
        // Reveal tile
        tile.revealed = true;
        if (tile.type === 'hidden') {
          tile.type = 'empty';
        }
        
        const isActionable = ['monster', 'eye', 'pit', 'boss'].includes(tile.type);
        if (isActionable) {
          const isBoss = tile.type === 'boss';
          
          if (isBoss && tile.damage > health) {
            // Boss defeat player
            setHealth(prev => prev - tile.damage);
            showFloatingText(`-${tile.damage} HP`, index, true);
            setGameState('lost');
            return newGrid;
          }
          
          // Apply damage
          setHealth(prev => prev - tile.damage);
          tile.isDefeated = true;
          needsNumberUpdate = true;
          
          if (tile.type !== 'pit') {
            showFloatingText(`-${tile.damage} HP`, index, true);
          }
          
          if (tile.type === 'eye') {
            revealNumbersAroundEye(newGrid, index);
          }
          
          if (isBoss) {
            setDefeatedBossesCount(prev => prev + 1);
            
            // Boss rewards
            if (tile.monsterName === 'Light Mage') {
              setMaxHealth(prev => prev + 4);
              setHealth(prev => prev + 4);
              showFloatingText("Max Health +4", index);
            }
            if (tile.monsterName === 'Dark Mage') {
              setMaxHealth(prev => prev + 5);
              setHealth(prev => prev + 5);
              showFloatingText("Max Health +5", index);
            }
            
            // Check win condition
            if (tile.monsterName === 'Golem') {
              setGameState('won');
            }
          }
        }
      }
      
      if (needsNumberUpdate) {
        updateNumbers(newGrid);
      }
      
      return newGrid;
    });
  }, [gameState, isFlagMode, health, maxHealth, showFloatingText]);

  // Check for lose condition
  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('lost');
    }
  }, [health, gameState]);

  const toggleFlagMode = useCallback(() => {
    setIsFlagMode(prev => !prev);
  }, []);

  const getCurrentBoss = () => {
    return BOSSES[defeatedBossesCount] || null;
  };

  return {
    grid,
    health,
    maxHealth,
    defeatedBossesCount,
    isFlagMode,
    gameState,
    floatingTexts,
    initializeGrid,
    handleTileClick,
    toggleFlagMode,
    getCurrentBoss
  };
};
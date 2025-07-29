import React, { useEffect } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameHeader from './components/GameHeader';
import GameGrid from './components/GameGrid';
import GameFooter from './components/GameFooter';
import MonsterInfoPanel from './components/MonsterInfoPanel';

function App() {
  const {
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
  } = useGameLogic();

  // Initialize game on mount
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const currentBoss = getCurrentBoss();

  return (
    <div className="bg-game-bg text-white min-h-screen p-5 flex justify-center items-start font-game">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Main Game Container */}
        <div className="flex flex-col items-center gap-1 w-full select-none">
          <GameHeader 
            currentBoss={currentBoss}
            defeatedBossesCount={defeatedBossesCount}
          />
          
          <GameGrid
            grid={grid}
            onTileClick={handleTileClick}
            floatingTexts={floatingTexts}
            gameState={gameState}
            onNewGame={initializeGrid}
          />
          
          <GameFooter
            isFlagMode={isFlagMode}
            onToggleFlagMode={toggleFlagMode}
            health={health}
            maxHealth={maxHealth}
          />
        </div>

        {/* Monster Info Panel */}
        <MonsterInfoPanel grid={grid} />
      </div>
    </div>
  );
}

export default App;
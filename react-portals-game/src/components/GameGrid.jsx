import React from 'react';
import Tile from './Tile';
import FloatingText from './FloatingText';
import GameOverModal from './GameOverModal';

const GameGrid = ({ 
  grid, 
  onTileClick, 
  floatingTexts, 
  gameState, 
  onNewGame 
}) => {
  const gridClasses = `
    grid grid-cols-7 gap-0.5 bg-gray-500 p-0.5 rounded-lg 
    h-[80vh] w-[calc(80vh*7/11)] max-w-[98vw] max-h-[98vh]
    ${gameState !== 'playing' ? 'brightness-40' : ''}
  `;

  return (
    <div className="relative">
      <div className={gridClasses}>
        {grid.map((tile, index) => (
          <Tile
            key={index}
            tile={tile}
            index={index}
            onClick={onTileClick}
          />
        ))}
      </div>
      
      {/* Floating texts */}
      {floatingTexts.map(ft => (
        <FloatingText key={ft.id} floatingText={ft} />
      ))}
      
      {/* Game over modal */}
      {gameState !== 'playing' && (
        <GameOverModal 
          isWin={gameState === 'won'} 
          onNewGame={onNewGame}
        />
      )}
    </div>
  );
};

export default GameGrid;
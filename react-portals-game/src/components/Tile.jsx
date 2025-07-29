import React from 'react';

const Tile = ({ tile, index, onClick }) => {
  const handleClick = () => {
    onClick(index);
  };

  const getIconClass = (monsterName) => {
    return monsterName?.replace(/\s+/g, '-') || '';
  };

  const renderTileContent = () => {
    // Flagged tiles
    if (tile.flagged) {
      return null; // CSS handles the flag background
    }

    // Hidden tiles
    if (!tile.revealed) {
      return null;
    }

    // Hidden by eye
    if (tile.isHiddenByEye && !tile.isDefeated) {
      return <span className="value-center text-white font-bold">?</span>;
    }

    const isMonsterTile = ['monster', 'boss', 'eye', 'pit'].includes(tile.type);

    if (isMonsterTile) {
      const iconClass = tile.type === 'pit' ? 'pit' : getIconClass(tile.monsterName);
      const positionClass = tile.type === 'pit' ? 'icon-center' : 'icon-top';
      const opacityClass = tile.isDefeated ? 'opacity-35' : '';

      return (
        <>
          <div className={`${positionClass} ${iconClass} ${opacityClass}`} />
          {tile.type !== 'pit' && (
            <span className={`damage value-bottom text-yellow-400 font-bold ${opacityClass}`}>
              {tile.damage}
            </span>
          )}
          {tile.isDefeated && tile.value >= 0 && (
            <span className="value value-center text-white font-bold text-base">
              {tile.value}
            </span>
          )}
        </>
      );
    } else if (tile.type === 'empty') {
      if (tile.hasPotion) {
        if (tile.potionUsed) {
          // Used potion, show number if available
          if (tile.value >= 0) {
            return (
              <span className="value value-center text-white font-bold">
                {tile.value}
              </span>
            );
          }
        } else {
          // Unused potion
          return (
            <>
              <div className="potion-icon-display" />
              {tile.value >= 0 && (
                <span className="value value-bottom text-white font-bold">
                  {tile.value}
                </span>
              )}
            </>
          );
        }
      } else {
        // Regular empty tile with number
        if (tile.value >= 0) {
          return (
            <span className="value text-white font-bold">
              {tile.value}
            </span>
          );
        }
      }
    }

    return null;
  };

  // Determine tile classes
  let tileClasses = 'tile w-full bg-cover cursor-pointer flex items-center justify-center font-bold select-none';
  
  if (tile.flagged) {
    tileClasses += ' flagged bg-tile-hidden';
  } else if (!tile.revealed) {
    tileClasses += ' bg-tile-hidden';
  } else {
    tileClasses += ' bg-tile-empty';
  }

  return (
    <div className={tileClasses} onClick={handleClick}>
      {renderTileContent()}
    </div>
  );
};

export default Tile;
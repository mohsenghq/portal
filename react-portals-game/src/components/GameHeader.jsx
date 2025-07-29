import React from 'react';

const GameHeader = ({ currentBoss, defeatedBossesCount }) => {
  return (
    <header className="text-lg font-bold flex items-center gap-2 text-white">
      <span>Hunt and kill</span>
      <span className="text-blue-300">
        {currentBoss ? currentBoss.name : 'Cleared!'}
      </span>
      <span className="text-gray-400">
        ({defeatedBossesCount}/3)
      </span>
    </header>
  );
};

export default GameHeader;
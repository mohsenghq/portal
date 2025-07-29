import React from 'react';
import { BOSSES, MONSTERS } from '../gameConstants';

const MonsterInfoPanel = ({ grid }) => {
  const allMonsterTypes = [...BOSSES, ...MONSTERS.filter(m => m.type !== 'pit')];

  const getIconClass = (monsterName) => {
    return monsterName.replace(/\s+/g, '-');
  };

  return (
    <div className="w-72 bg-panel-bg rounded-lg p-4 flex flex-col gap-3">
      {allMonsterTypes.map(monster => {
        const remaining = grid.filter(
          tile => tile.monsterName === monster.name && !tile.isDefeated
        ).length;
        
        const isCleared = remaining === 0;
        
        return (
          <div 
            key={monster.name}
            className={`
              flex items-center gap-3 text-sm transition-all duration-300
              ${isCleared ? 'opacity-50 grayscale' : ''}
            `}
          >
            <div 
              className={`
                w-8 h-8 bg-contain bg-no-repeat bg-center
                ${getIconClass(monster.name)}
              `}
            />
            <div className="flex flex-col flex-grow">
              <span className="font-bold text-white">{monster.name}</span>
              <span className="text-gray-400">Dmg: {monster.damage}</span>
            </div>
            <div className="ml-auto text-lg font-bold text-white">
              {remaining}/{monster.amount}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonsterInfoPanel;
import React from 'react';

const GameFooter = ({ 
  isFlagMode, 
  onToggleFlagMode, 
  health, 
  maxHealth 
}) => {
  return (
    <footer className="flex justify-between items-center w-full px-5">
      <button
        onClick={onToggleFlagMode}
        className={`
          bg-transparent border-none cursor-pointer p-0 rounded-lg transition-colors
          ${isFlagMode ? 'bg-white bg-opacity-20' : ''}
        `}
      >
        <img 
          src="/icons/flag.png" 
          alt="Flag Mode" 
          className="w-10 h-10"
        />
      </button>
      
      <div className="flex items-center text-base gap-1.5">
        <img 
          src="/icons/heart.png" 
          alt="Health" 
          className="w-6 h-6"
        />
        <span className="text-white">
          {Math.max(0, health)}/{maxHealth}
        </span>
      </div>
    </footer>
  );
};

export default GameFooter;
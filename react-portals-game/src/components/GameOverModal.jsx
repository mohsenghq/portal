import React from 'react';

const GameOverModal = ({ isWin, onNewGame }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-panel-bg p-6 md:p-12 rounded-xl text-center shadow-2xl flex flex-col gap-4 fade-in">
        <h2 
          className={`text-3xl font-bold m-0 ${isWin ? 'text-green-400' : 'text-red-400'}`}
        >
          {isWin ? 'You Win!' : 'You Lose!'}
        </h2>
        <button
          onClick={onNewGame}
          className="px-5 py-2.5 text-base font-bold text-white bg-blue-600 border-none rounded-md cursor-pointer transition-colors hover:bg-blue-700"
        >
          New Game
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
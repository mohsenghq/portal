import React from 'react';

const FloatingText = ({ floatingText }) => {
  const { text, x, y, isDamage } = floatingText;
  
  return (
    <div 
      className={`floating-text ${isDamage ? 'text-red-400' : 'text-green-400'}`}
      style={{
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {text}
    </div>
  );
};

export default FloatingText;

import React from 'react';
import { useAnimations } from '@/contexts/AnimationContext';

export const CoinAnimation = () => {
  const { animationState } = useAnimations();

  return (
    <div className="absolute top-0 left-0 pointer-events-none z-50">
      {animationState.coins.map((coin, index) => (
        <div
          key={coin.id}
          className={`absolute coin-animation ${coin.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
          style={{
            animationDelay: `${index * 100}ms`,
            top: `${index * 20}px`
          }}
        >
          <div className="flex items-center space-x-1 font-bold mobile-text-sm bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg">
            <span>{coin.amount > 0 ? '+' : ''}{coin.amount.toLocaleString()}</span>
            <span>🪙</span>
          </div>
        </div>
      ))}
    </div>
  );
};

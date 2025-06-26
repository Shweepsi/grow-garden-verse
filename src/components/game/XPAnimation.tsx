
import React from 'react';
import { useAnimations } from '@/contexts/AnimationContext';

export const XPAnimation = () => {
  const { animationState } = useAnimations();

  return (
    <div className="absolute top-0 right-0 pointer-events-none z-50">
      {animationState.xp.map((xp, index) => (
        <div
          key={xp.id}
          className="absolute xp-animation text-purple-600"
          style={{
            animationDelay: `${index * 100}ms`,
            top: `${index * 20}px`
          }}
        >
          <div className="flex items-center space-x-1 font-bold mobile-text-sm bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg">
            <span>+{xp.amount} XP</span>
            <span>⭐</span>
          </div>
        </div>
      ))}
    </div>
  );
};

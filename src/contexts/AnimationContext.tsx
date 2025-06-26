
import React, { createContext, useContext, useRef, useState } from 'react';
import { CoinAnimation } from '@/components/game/CoinAnimation';
import { XPAnimation } from '@/components/game/XPAnimation';

interface Animation {
  id: string;
  type: 'coin' | 'xp';
  amount: number;
  startX?: number;
  startY?: number;
}

interface AnimationContextType {
  showCoinAnimation: (amount: number, startX?: number, startY?: number) => void;
  showXPAnimation: (amount: number, startX?: number, startY?: number) => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: React.ReactNode;
}

export const AnimationProvider = ({ children }: AnimationProviderProps) => {
  const [animations, setAnimations] = useState<Animation[]>([]);

  const showCoinAnimation = (amount: number, startX?: number, startY?: number) => {
    const id = `coin-${Date.now()}-${Math.random()}`;
    setAnimations(prev => [...prev, { id, type: 'coin', amount, startX, startY }]);
  };

  const showXPAnimation = (amount: number, startX?: number, startY?: number) => {
    const id = `xp-${Date.now()}-${Math.random()}`;
    setAnimations(prev => [...prev, { id, type: 'xp', amount, startX, startY }]);
  };

  const removeAnimation = (id: string) => {
    setAnimations(prev => prev.filter(anim => anim.id !== id));
  };

  return (
    <AnimationContext.Provider value={{ showCoinAnimation, showXPAnimation }}>
      {children}
      
      {animations.map(animation => (
        animation.type === 'coin' ? (
          <CoinAnimation
            key={animation.id}
            amount={animation.amount}
            startX={animation.startX}
            startY={animation.startY}
            onComplete={() => removeAnimation(animation.id)}
          />
        ) : (
          <XPAnimation
            key={animation.id}
            amount={animation.amount}
            startX={animation.startX}
            startY={animation.startY}
            onComplete={() => removeAnimation(animation.id)}
          />
        )
      ))}
    </AnimationContext.Provider>
  );
};

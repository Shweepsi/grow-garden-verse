
import { useState, useCallback } from 'react';
import { CoinAnimation } from './CoinAnimation';
import { XPAnimation } from './XPAnimation';

interface Animation {
  id: string;
  type: 'coin' | 'xp';
  amount: number;
  startX?: number;
  startY?: number;
}

interface AnimationManagerProps {
  children: React.ReactNode;
}

export const AnimationManager = ({ children }: AnimationManagerProps) => {
  const [animations, setAnimations] = useState<Animation[]>([]);

  const addCoinAnimation = useCallback((amount: number, startX?: number, startY?: number) => {
    const id = `coin-${Date.now()}-${Math.random()}`;
    setAnimations(prev => [...prev, { id, type: 'coin', amount, startX, startY }]);
  }, []);

  const addXPAnimation = useCallback((amount: number, startX?: number, startY?: number) => {
    const id = `xp-${Date.now()}-${Math.random()}`;
    setAnimations(prev => [...prev, { id, type: 'xp', amount, startX, startY }]);
  }, []);

  const removeAnimation = useCallback((id: string) => {
    setAnimations(prev => prev.filter(anim => anim.id !== id));
  }, []);

  return (
    <div className="relative w-full h-full">
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
    </div>
  );
};

// Hook pour utiliser les animations
export const useAnimations = () => {
  // Ce hook sera utilisé via un contexte ou ref
  return {
    addCoinAnimation: () => {},
    addXPAnimation: () => {}
  };
};

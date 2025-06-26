
import { useState } from 'react';
import { CoinAnimation } from './CoinAnimation';
import { XPAnimation } from './XPAnimation';

interface AnimationData {
  id: string;
  type: 'coin' | 'xp';
  amount: number;
}

export const useAnimations = () => {
  const [animations, setAnimations] = useState<AnimationData[]>([]);

  const showCoinAnimation = (amount: number) => {
    const id = Date.now().toString();
    setAnimations(prev => [...prev, { id, type: 'coin', amount }]);
  };

  const showXPAnimation = (amount: number) => {
    const id = Date.now().toString();
    setAnimations(prev => [...prev, { id, type: 'xp', amount }]);
  };

  const removeAnimation = (id: string) => {
    setAnimations(prev => prev.filter(anim => anim.id !== id));
  };

  const AnimationContainer = () => (
    <>
      {animations.map(animation => (
        animation.type === 'coin' ? (
          <CoinAnimation
            key={animation.id}
            amount={animation.amount}
            onComplete={() => removeAnimation(animation.id)}
          />
        ) : (
          <XPAnimation
            key={animation.id}
            amount={animation.amount}
            onComplete={() => removeAnimation(animation.id)}
          />
        )
      ))}
    </>
  );

  return {
    showCoinAnimation,
    showXPAnimation,
    AnimationContainer
  };
};

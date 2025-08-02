import React, { createContext, useContext, useState, useCallback } from 'react';

export interface FloatingAnimation {
  id: string;
  amount: number;
  type: 'coins' | 'experience' | 'gems';
  timestamp: number;
}

interface AnimationContextType {
  animations: FloatingAnimation[];
  triggerCoinAnimation: (amount: number) => void;
  triggerXpAnimation: (amount: number) => void;
  triggerGemAnimation: (amount: number) => void;
  removeAnimation: (id: string) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
};

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [animations, setAnimations] = useState<FloatingAnimation[]>([]);
  // Chaque récolte déclenche sa propre animation. Aucune accumulation temporelle.

  const triggerCoinAnimation = useCallback((amount: number) => {
    const id = `coin-${Date.now()}-${Math.random()}`;
    setAnimations(current => [...current, {
      id,
      amount,
      type: 'coins',
      timestamp: Date.now()
    }]);
  }, []);

  const triggerXpAnimation = useCallback((amount: number) => {
    const id = `xp-${Date.now()}-${Math.random()}`;
    setAnimations(current => [...current, {
      id,
      amount,
      type: 'experience',
      timestamp: Date.now()
    }]);
  }, []);

  const triggerGemAnimation = useCallback((amount: number) => {
    const id = `gem-${Date.now()}-${Math.random()}`;
    setAnimations(current => [...current, {
      id,
      amount,
      type: 'gems',
      timestamp: Date.now()
    }]);
  }, []);

  const removeAnimation = useCallback((id: string) => {
    setAnimations(current => current.filter(anim => anim.id !== id));
  }, []);

  return (
    <AnimationContext.Provider value={{
      animations,
      triggerCoinAnimation,
      triggerXpAnimation,
      triggerGemAnimation,
      removeAnimation
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

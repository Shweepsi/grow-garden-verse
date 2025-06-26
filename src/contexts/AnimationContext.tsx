
import React, { createContext, useContext, useState, useCallback } from 'react';

interface AnimationState {
  coins: {
    amount: number;
    timestamp: number;
    id: string;
  }[];
  xp: {
    amount: number;
    timestamp: number;
    id: string;
  }[];
}

interface AnimationContextType {
  triggerCoinAnimation: (amount: number) => void;
  triggerXPAnimation: (amount: number) => void;
  coinAnimations: AnimationState['coins'];
  xpAnimations: AnimationState['xp'];
  removeAnimation: (type: 'coins' | 'xp', id: string) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [animations, setAnimations] = useState<AnimationState>({
    coins: [],
    xp: []
  });

  const triggerCoinAnimation = useCallback((amount: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    setAnimations(prev => ({
      ...prev,
      coins: [...prev.coins, { amount, timestamp, id }]
    }));
  }, []);

  const triggerXPAnimation = useCallback((amount: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    setAnimations(prev => ({
      ...prev,
      xp: [...prev.xp, { amount, timestamp, id }]
    }));
  }, []);

  const removeAnimation = useCallback((type: 'coins' | 'xp', id: string) => {
    setAnimations(prev => ({
      ...prev,
      [type]: prev[type].filter(anim => anim.id !== id)
    }));
  }, []);

  return (
    <AnimationContext.Provider value={{
      triggerCoinAnimation,
      triggerXPAnimation,
      coinAnimations: animations.coins,
      xpAnimations: animations.xp,
      removeAnimation
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
};

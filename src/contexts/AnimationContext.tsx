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
  const [coinAccumulator, setCoinAccumulator] = useState<{ amount: number; timer: NodeJS.Timeout | null }>({
    amount: 0,
    timer: null
  });
  const [xpAccumulator, setXpAccumulator] = useState<{ amount: number; timer: NodeJS.Timeout | null }>({
    amount: 0,
    timer: null
  });
  const [gemAccumulator, setGemAccumulator] = useState<{ amount: number; timer: NodeJS.Timeout | null }>({
    amount: 0,
    timer: null
  });

  const triggerCoinAnimation = useCallback((amount: number) => {
    setCoinAccumulator(prev => {
      if (prev.timer) {
        clearTimeout(prev.timer);
      }
      
      const newAmount = prev.amount + amount;
      
      const timer = setTimeout(() => {
        const id = `coin-${Date.now()}-${Math.random()}`;
        setAnimations(current => [...current, {
          id,
          amount: newAmount,
          type: 'coins',
          timestamp: Date.now()
        }]);
        
        setCoinAccumulator({ amount: 0, timer: null });
      }, 300);
      
      return { amount: newAmount, timer };
    });
  }, []);

  const triggerXpAnimation = useCallback((amount: number) => {
    setXpAccumulator(prev => {
      if (prev.timer) {
        clearTimeout(prev.timer);
      }
      
      const newAmount = prev.amount + amount;
      
      const timer = setTimeout(() => {
        const id = `xp-${Date.now()}-${Math.random()}`;
        setAnimations(current => [...current, {
          id,
          amount: newAmount,
          type: 'experience',
          timestamp: Date.now()
        }]);
        
        setXpAccumulator({ amount: 0, timer: null });
      }, 300);
      
      return { amount: newAmount, timer };
    });
  }, []);

  const triggerGemAnimation = useCallback((amount: number) => {
    setGemAccumulator(prev => {
      if (prev.timer) {
        clearTimeout(prev.timer);
      }
      
      const newAmount = prev.amount + amount;
      
      const timer = setTimeout(() => {
        const id = `gem-${Date.now()}-${Math.random()}`;
        setAnimations(current => [...current, {
          id,
          amount: newAmount,
          type: 'gems',
          timestamp: Date.now()
        }]);
        
        setGemAccumulator({ amount: 0, timer: null });
      }, 300);
      
      return { amount: newAmount, timer };
    });
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

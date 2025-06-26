
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface AnimationState {
  coins: {
    amount: number;
    isVisible: boolean;
    id: number;
  }[];
  xp: {
    amount: number;
    isVisible: boolean;
    id: number;
  }[];
}

interface AnimationContextType {
  animationState: AnimationState;
  triggerCoinAnimation: (amount: number) => void;
  triggerXPAnimation: (amount: number) => void;
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
  const [animationState, setAnimationState] = useState<AnimationState>({
    coins: [],
    xp: []
  });
  
  const animationIdRef = useRef(0);
  const accumulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCoins = useRef(0);
  const pendingXP = useRef(0);

  const triggerCoinAnimation = useCallback((amount: number) => {
    console.log(`💰 Animation pièces déclenchée: ${amount}`);
    
    // Accumuler les montants pendant 300ms
    pendingCoins.current += amount;
    
    if (accumulationTimeoutRef.current) {
      clearTimeout(accumulationTimeoutRef.current);
    }
    
    accumulationTimeoutRef.current = setTimeout(() => {
      const totalAmount = pendingCoins.current;
      pendingCoins.current = 0;
      
      if (totalAmount !== 0) {
        const id = ++animationIdRef.current;
        
        setAnimationState(prev => ({
          ...prev,
          coins: [...prev.coins, { amount: totalAmount, isVisible: true, id }]
        }));
        
        // Supprimer l'animation après 3 secondes
        setTimeout(() => {
          setAnimationState(prev => ({
            ...prev,
            coins: prev.coins.filter(coin => coin.id !== id)
          }));
        }, 3000);
      }
    }, 300);
  }, []);

  const triggerXPAnimation = useCallback((amount: number) => {
    console.log(`⭐ Animation XP déclenchée: ${amount}`);
    
    // Accumuler les montants pendant 300ms
    pendingXP.current += amount;
    
    if (accumulationTimeoutRef.current) {
      clearTimeout(accumulationTimeoutRef.current);
    }
    
    accumulationTimeoutRef.current = setTimeout(() => {
      const totalAmount = pendingXP.current;
      pendingXP.current = 0;
      
      if (totalAmount !== 0) {
        const id = ++animationIdRef.current;
        
        setAnimationState(prev => ({
          ...prev,
          xp: [...prev.xp, { amount: totalAmount, isVisible: true, id }]
        }));
        
        // Supprimer l'animation après 3 secondes
        setTimeout(() => {
          setAnimationState(prev => ({
            ...prev,
            xp: prev.xp.filter(xp => xp.id !== id)
          }));
        }, 3000);
      }
    }, 300);
  }, []);

  return (
    <AnimationContext.Provider value={{
      animationState,
      triggerCoinAnimation,
      triggerXPAnimation
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

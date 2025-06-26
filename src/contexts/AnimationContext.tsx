
import React, { createContext, useContext, useState, useCallback } from 'react';

interface CoinAnimation {
  id: string;
  amount: number;
  timestamp: number;
}

interface AnimationContextType {
  triggerCoinAnimation: (amount: number) => void;
  triggerXpAnimation: (amount: number) => void;
  coinAnimations: CoinAnimation[];
  xpAnimations: CoinAnimation[];
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }: { children: React.ReactNode }) => {
  const [coinAnimations, setCoinAnimations] = useState<CoinAnimation[]>([]);
  const [xpAnimations, setXpAnimations] = useState<CoinAnimation[]>([]);
  const [pendingCoinAmount, setPendingCoinAmount] = useState(0);
  const [pendingXpAmount, setPendingXpAmount] = useState(0);
  const [coinTimer, setCoinTimer] = useState<NodeJS.Timeout | null>(null);
  const [xpTimer, setXpTimer] = useState<NodeJS.Timeout | null>(null);

  const triggerCoinAnimation = useCallback((amount: number) => {
    // Accumuler les montants pendant 500ms
    setPendingCoinAmount(prev => prev + amount);
    
    if (coinTimer) {
      clearTimeout(coinTimer);
    }
    
    const newTimer = setTimeout(() => {
      const id = Math.random().toString(36).substr(2, 9);
      const animation: CoinAnimation = {
        id,
        amount: pendingCoinAmount + amount,
        timestamp: Date.now()
      };
      
      setCoinAnimations(prev => [...prev, animation]);
      setPendingCoinAmount(0);
      setCoinTimer(null);
      
      // Supprimer l'animation après 2 secondes
      setTimeout(() => {
        setCoinAnimations(prev => prev.filter(a => a.id !== id));
      }, 2000);
    }, 500);
    
    setCoinTimer(newTimer);
  }, [coinTimer, pendingCoinAmount]);

  const triggerXpAnimation = useCallback((amount: number) => {
    // Accumuler les montants pendant 500ms
    setPendingXpAmount(prev => prev + amount);
    
    if (xpTimer) {
      clearTimeout(xpTimer);
    }
    
    const newTimer = setTimeout(() => {
      const id = Math.random().toString(36).substr(2, 9);
      const animation: CoinAnimation = {
        id,
        amount: pendingXpAmount + amount,
        timestamp: Date.now()
      };
      
      setXpAnimations(prev => [...prev, animation]);
      setPendingXpAmount(0);
      setXpTimer(null);
      
      // Supprimer l'animation après 2 secondes
      setTimeout(() => {
        setXpAnimations(prev => prev.filter(a => a.id !== id));
      }, 2000);
    }, 500);
    
    setXpTimer(newTimer);
  }, [xpTimer, pendingXpAmount]);

  return (
    <AnimationContext.Provider 
      value={{ 
        triggerCoinAnimation, 
        triggerXpAnimation, 
        coinAnimations, 
        xpAnimations 
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};


import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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
  
  // États d'accumulation optimisés avec useMemo pour éviter les re-renders
  const [accumulators, setAccumulators] = useState<{
    coin: { amount: number; timer: NodeJS.Timeout | null };
    xp: { amount: number; timer: NodeJS.Timeout | null };
    gem: { amount: number; timer: NodeJS.Timeout | null };
  }>({
    coin: { amount: 0, timer: null },
    xp: { amount: 0, timer: null },
    gem: { amount: 0, timer: null }
  });

  // Fonction générique optimisée pour déclencher les animations
  const createAnimationTrigger = useCallback((
    type: 'coins' | 'experience' | 'gems',
    accumulatorKey: 'coin' | 'xp' | 'gem'
  ) => {
    return (amount: number) => {
      setAccumulators(prev => {
        const current = prev[accumulatorKey];
        
        if (current.timer) {
          clearTimeout(current.timer);
        }
        
        const newAmount = current.amount + amount;
        
        // Debouncing optimisé pour mobile - délai réduit pour fluidité
        const timer = setTimeout(() => {
          const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          setAnimations(current => {
            // Limiter le nombre d'animations simultanées pour les performances
            const filtered = current.filter(anim => 
              Date.now() - anim.timestamp < 2000 // Garder seulement les animations récentes
            );
            
            return [...filtered, {
              id,
              amount: newAmount,
              type,
              timestamp: Date.now()
            }];
          });
          
          setAccumulators(prevAcc => ({
            ...prevAcc,
            [accumulatorKey]: { amount: 0, timer: null }
          }));
        }, 200); // Délai réduit de 300ms à 200ms pour plus de réactivité
        
        return {
          ...prev,
          [accumulatorKey]: { amount: newAmount, timer }
        };
      });
    };
  }, []);

  // Mémoriser les triggers pour éviter les re-renders
  const triggerCoinAnimation = useMemo(() => 
    createAnimationTrigger('coins', 'coin'), 
    [createAnimationTrigger]
  );
  
  const triggerXpAnimation = useMemo(() => 
    createAnimationTrigger('experience', 'xp'), 
    [createAnimationTrigger]
  );
  
  const triggerGemAnimation = useMemo(() => 
    createAnimationTrigger('gems', 'gem'), 
    [createAnimationTrigger]
  );

  const removeAnimation = useCallback((id: string) => {
    setAnimations(current => current.filter(anim => anim.id !== id));
  }, []);

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo(() => ({
    animations,
    triggerCoinAnimation,
    triggerXpAnimation,
    triggerGemAnimation,
    removeAnimation
  }), [animations, triggerCoinAnimation, triggerXpAnimation, triggerGemAnimation, removeAnimation]);

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

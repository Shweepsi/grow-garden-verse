import React, { createContext, useContext, useState, useCallback } from 'react';

export interface FloatingAnimation {
  id: string;
  amount: number;
  type: 'coins' | 'experience' | 'gems';
  timestamp: number;
  offsetX?: number; // Décalage horizontal pour éviter le chevauchement
  offsetY?: number; // Décalage vertical pour éviter le chevauchement
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
    setAnimations(current => {
      const id = `coin-${Date.now()}-${Math.random()}`;
      const positionIndex = current.length % 9; // 0–8
      const col = positionIndex % 3; // 0,1,2
      const row = Math.floor(positionIndex / 3); // 0,1,2
      const offsetX = (col - 1) * 30; // -30, 0, 30 px
      const offsetY = (row - 1) * 30; // -30, 0, 30 px
      return [...current, {
        id,
        amount,
        type: 'coins',
        timestamp: Date.now(),
        offsetX,
        offsetY
      }];
    });
  }, []);

  const triggerXpAnimation = useCallback((amount: number) => {
    setAnimations(current => {
      const id = `xp-${Date.now()}-${Math.random()}`;
      const positionIndex = current.length % 9;
      const row = Math.floor(positionIndex / 3); // 0,1,2
      const offsetX = 30; // Toujours à droite pour éviter un chevauchement avec les gemmes
      const offsetY = (row - 1) * 30;
      return [...current, {
        id,
        amount,
        type: 'experience',
        timestamp: Date.now(),
        offsetX,
        offsetY
      }];
    });
  }, []);

  const triggerGemAnimation = useCallback((amount: number) => {
    setAnimations(current => {
      const id = `gem-${Date.now()}-${Math.random()}`;
      const positionIndex = current.length % 9;
      const col = positionIndex % 3;
      const row = Math.floor(positionIndex / 3);
      const offsetX = (col - 1) * 30;
      const offsetY = (row - 1) * 30;
      return [...current, {
        id,
        amount,
        type: 'gems',
        timestamp: Date.now(),
        offsetX,
        offsetY
      }];
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

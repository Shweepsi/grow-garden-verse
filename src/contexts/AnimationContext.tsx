import React, { createContext, useContext, useState, useCallback } from 'react';

export interface FloatingAnimation {
  id: string;
  amount: number;
  type: 'coins' | 'experience' | 'gems';
  timestamp: number;
  row: number; // 0-2
  col: number; // 0-2
  jitterX: number; // petit décalage aléatoire px
  jitterY: number;
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
      const sameTypeCount = current.filter(a => a.type === 'coins').length;
      const positionIndex = sameTypeCount % 9; // 0–8
      const col = positionIndex % 3; // 0,1,2
      const row = Math.floor(positionIndex / 3); // 0,1,2
      const jitter = () => Math.floor((Math.random() - 0.5) * 8); // -4 … +4 px
      const offsetX = jitter();
      const offsetY = jitter();
      return [...current, {
        id,
        amount,
        type: 'coins',
        timestamp: Date.now(),
        row,
        col,
        jitterX: offsetX,
        jitterY: offsetY
      }];
    });
  }, []);

  const triggerXpAnimation = useCallback((amount: number) => {
    setAnimations(current => {
      const id = `xp-${Date.now()}-${Math.random()}`;
      const sameTypeCount = current.filter(a => a.type === 'experience').length;
      const positionIndex = sameTypeCount % 9;
      const col = positionIndex % 3;
      const row = Math.floor(positionIndex / 3);
      const jitter = () => Math.floor((Math.random() - 0.5) * 8);
      const offsetX = jitter();
      const offsetY = jitter();
      return [...current, {
        id,
        amount,
        type: 'experience',
        timestamp: Date.now(),
        row,
        col,
        jitterX: offsetX,
        jitterY: offsetY
      }];
    });
  }, []);

  const triggerGemAnimation = useCallback((amount: number) => {
    setAnimations(current => {
      const id = `gem-${Date.now()}-${Math.random()}`;
      const sameTypeCount = current.filter(a => a.type === 'gems').length;
      const positionIndex = sameTypeCount % 9;
      const col = positionIndex % 3;
      const row = Math.floor(positionIndex / 3);
      const jitter = () => Math.floor((Math.random() - 0.5) * 8);
      const offsetX = jitter();
      const offsetY = jitter();
      return [...current, {
        id,
        amount,
        type: 'gems',
        timestamp: Date.now(),
        row,
        col,
        jitterX: offsetX,
        jitterY: offsetY
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

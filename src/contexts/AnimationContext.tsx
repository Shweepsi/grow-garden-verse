import React, { createContext, useContext, useState, useCallback } from 'react';

export interface FloatingAnimation {
  id: string;
  amount: number;
  type: 'coins' | 'experience' | 'gems';
  timestamp: number;
  offsetX?: number; // Décalage horizontal (px) pour éviter le chevauchement
  offsetY?: number; // Décalage vertical (px) pour éviter le chevauchement
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
      // Coins zone à gauche : uniquement décalage positif pour rester dans la zone
      const baseOffsetX = col * 30; // 0, 30, 60 px
      const baseOffsetY = (row - 1) * 30; // -30, 0, 30 px
      const jitter = () => Math.floor((Math.random() - 0.5) * 12); // -6 … +6 px
      const offsetX = baseOffsetX + jitter();
      const offsetY = baseOffsetY + jitter();
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
      const sameTypeCount = current.filter(a => a.type === 'experience').length;
      const positionIndex = sameTypeCount % 9;
      const col = positionIndex % 3;
      const row = Math.floor(positionIndex / 3);
      // XP zone à droite : uniquement décalage négatif pour rester dans la zone
      const baseOffsetX = -col * 30; // 0, -30, -60 px
      const baseOffsetY = row * 30; // 0, 30, 60 px pour éviter chevauchement avec gemmes
      const jitter = () => Math.floor((Math.random() - 0.5) * 12);
      const offsetX = baseOffsetX + jitter();
      const offsetY = baseOffsetY + jitter();
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
      const sameTypeCount = current.filter(a => a.type === 'gems').length;
      const positionIndex = sameTypeCount % 9;
      const col = positionIndex % 3;
      const row = Math.floor(positionIndex / 3);
      // Gemmes au centre : décalage symétrique
      const baseOffsetX = (col - 1) * 30; // -30, 0, 30 px
      const baseOffsetY = (row - 1) * 30;
      const jitter = () => Math.floor((Math.random() - 0.5) * 12);
      const offsetX = baseOffsetX + jitter();
      const offsetY = baseOffsetY + jitter();
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

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

  // Facteur commun pour générer un FloatingAnimation
  const createAnimation = (
    type: FloatingAnimation['type'],
    amount: number,
    current: FloatingAnimation[]
  ): FloatingAnimation => {
    const id = `${type}-${Date.now()}-${Math.random()}`;

    // Déterminer la position libre dans la grille (0-8)
    const occupied = current
      .filter(a => a.type === type)
      .map(a => a.row * 3 + a.col);

    let cellIndex = 0;
    for (; cellIndex < 9; cellIndex++) {
      if (!occupied.includes(cellIndex)) break;
    }

    // Si toutes les cellules sont occupées, on recycle en remplaçant la plus ancienne
    if (cellIndex === 9) {
      const oldestIndex = occupied[0] ?? 0;
      cellIndex = oldestIndex;
    }

    const col = cellIndex % 3; // 0,1,2
    const row = Math.floor(cellIndex / 3); // 0,1,2

    const JITTER_RANGE = 60; // ±30px
    const jitter = () => Math.floor((Math.random() - 0.5) * JITTER_RANGE); // -10 … +10 px

    return {
      id,
      amount,
      type,
      timestamp: Date.now(),
      row,
      col,
      jitterX: jitter(),
      jitterY: jitter()
    };
  };

  // Générateur de fonctions déclencheurs pour chaque type
  const makeTrigger = (type: FloatingAnimation['type']) =>
    (amount: number) => setAnimations(prev => [...prev, createAnimation(type, amount, prev)]);

  const triggerCoinAnimation = useCallback(makeTrigger('coins'), []);
  const triggerXpAnimation = useCallback(makeTrigger('experience'), []);
  const triggerGemAnimation = useCallback(makeTrigger('gems'), []);

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


import React, { useEffect, useState } from 'react';
import { useAnimations } from '@/contexts/AnimationContext';

export const XPAnimation: React.FC = () => {
  const { xpAnimations, removeAnimation } = useAnimations();
  const [visibleAnimations, setVisibleAnimations] = useState<Array<{
    id: string;
    amount: number;
    isExiting: boolean;
  }>>([]);

  useEffect(() => {
    xpAnimations.forEach(anim => {
      if (!visibleAnimations.find(v => v.id === anim.id)) {
        setVisibleAnimations(prev => [...prev, {
          id: anim.id,
          amount: anim.amount,
          isExiting: false
        }]);

        // Commencer la sortie après 2 secondes
        setTimeout(() => {
          setVisibleAnimations(prev => 
            prev.map(v => v.id === anim.id ? { ...v, isExiting: true } : v)
          );
        }, 2000);

        // Supprimer complètement après 2.5 secondes
        setTimeout(() => {
          removeAnimation('xp', anim.id);
          setVisibleAnimations(prev => prev.filter(v => v.id !== anim.id));
        }, 2500);
      }
    });
  }, [xpAnimations, removeAnimation, visibleAnimations]);

  return (
    <div className="absolute -top-1 -right-1 pointer-events-none">
      {visibleAnimations.map((anim, index) => (
        <div
          key={anim.id}
          className={`absolute transition-all duration-500 font-bold mobile-text-sm text-blue-600 ${
            anim.isExiting 
              ? 'opacity-0 translate-y-[-10px]' 
              : 'opacity-100 translate-y-0'
          }`}
          style={{
            transform: `translateY(${-index * 20}px)`,
            animation: anim.isExiting 
              ? 'none' 
              : 'slideUpFade 2s ease-out forwards'
          }}
        >
          +{anim.amount} XP
        </div>
      ))}
    </div>
  );
};

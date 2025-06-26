
import React, { useEffect, useState } from 'react';
import { useAnimations } from '@/contexts/AnimationContext';

export const CoinAnimation: React.FC = () => {
  const { coinAnimations, removeAnimation } = useAnimations();
  const [visibleAnimations, setVisibleAnimations] = useState<Array<{
    id: string;
    amount: number;
    isExiting: boolean;
  }>>([]);

  useEffect(() => {
    coinAnimations.forEach(anim => {
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
          removeAnimation('coins', anim.id);
          setVisibleAnimations(prev => prev.filter(v => v.id !== anim.id));
        }, 2500);
      }
    });
  }, [coinAnimations, removeAnimation, visibleAnimations]);

  return (
    <div className="absolute -top-1 -right-1 pointer-events-none">
      {visibleAnimations.map((anim, index) => (
        <div
          key={anim.id}
          className={`absolute transition-all duration-500 font-bold mobile-text-sm ${
            anim.isExiting 
              ? 'opacity-0 translate-y-[-10px]' 
              : 'opacity-100 translate-y-0'
          } ${
            anim.amount > 0 ? 'text-green-600' : 'text-red-600'
          }`}
          style={{
            transform: `translateY(${-index * 20}px)`,
            animation: anim.isExiting 
              ? 'none' 
              : 'slideUpFade 2s ease-out forwards'
          }}
        >
          {anim.amount > 0 ? '+' : ''}{anim.amount.toLocaleString()}
        </div>
      ))}
    </div>
  );
};


import React, { useEffect } from 'react';
import { Coins, Star } from 'lucide-react';
import { FloatingAnimation, useAnimations } from '@/contexts/AnimationContext';

interface FloatingNumberProps {
  animation: FloatingAnimation;
}

export const FloatingNumber: React.FC<FloatingNumberProps> = ({ animation }) => {
  const { removeAnimation } = useAnimations();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeAnimation(animation.id);
    }, 2000);

    return () => clearTimeout(timer);
  }, [animation.id, removeAnimation]);

  const isPositive = animation.amount > 0;

  // Formatage lisible pour les grands montants (> 100 000)
  const formatAmount = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      return `${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 100_000) {
      return `${(abs / 1_000).toFixed(1)}K`;
    }
    return abs.toLocaleString();
  };
  
  const renderIcon = () => {
    switch (animation.type) {
      case 'coins': 
        return <Coins className="w-3 h-3" />;
      case 'experience': 
        return <Star className="w-3 h-3" />;
      case 'gems': 
        return <span className="text-xs">💎</span>;
      default: 
        return <Coins className="w-3 h-3" />;
    }
  };
  
  return (
    <div
      className={`floating-number ${animation.type} ${isPositive ? 'positive' : 'negative'}`}
      key={animation.id}
    >
      <div className="flex items-center space-x-1">
        {renderIcon()}
        <span className="font-bold mobile-text-sm">
          {isPositive ? '+' : '-'}{formatAmount(animation.amount)}
        </span>
      </div>
    </div>
  );
};

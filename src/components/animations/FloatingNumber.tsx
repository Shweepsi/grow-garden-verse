
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
          {isPositive ? '+' : ''}{animation.amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

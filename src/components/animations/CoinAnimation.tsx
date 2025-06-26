
import React from 'react';
import { Coins, Star } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  type: 'coin' | 'xp';
  onComplete?: () => void;
}

export const CoinAnimation = ({ amount, type, onComplete }: CoinAnimationProps) => {
  const isPositive = amount > 0;
  const formatAmount = (num: number) => {
    const abs = Math.abs(num);
    const sign = num >= 0 ? '+' : '-';
    return `${sign}${abs.toLocaleString()}`;
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`
        absolute top-0 left-full ml-2 pointer-events-none z-30
        animate-[slideUpFade_2s_ease-out_forwards]
        ${isPositive ? 'text-green-600' : 'text-red-600'}
      `}
      style={{
        animationFillMode: 'forwards'
      }}
    >
      <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border">
        {type === 'coin' ? (
          <Coins className="h-3 w-3" />
        ) : (
          <Star className="h-3 w-3" />
        )}
        <span className="mobile-text-xs font-bold">
          {formatAmount(amount)}
        </span>
      </div>
    </div>
  );
};

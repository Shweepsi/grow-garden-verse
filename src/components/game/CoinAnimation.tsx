
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  onComplete: () => void;
  stackIndex: number;
}

export const CoinAnimation = ({ amount, onComplete, stackIndex }: CoinAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="absolute left-full ml-2 pointer-events-none z-50 animate-fade-in"
      style={{ 
        top: `${stackIndex * 20}px`,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="flex items-center space-x-1 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full shadow-lg animate-bounce">
        <Coins className="h-3 w-3" />
        <span className="font-bold text-xs">+{amount.toLocaleString()}</span>
      </div>
    </div>
  );
};

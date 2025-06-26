
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  onComplete: () => void;
}

export const CoinAnimation = ({ amount, onComplete }: CoinAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
      <div className="animate-bounce">
        <div className="flex items-center space-x-2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full shadow-lg">
          <Coins className="h-5 w-5" />
          <span className="font-bold">+{amount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

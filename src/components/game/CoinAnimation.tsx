
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  onComplete: () => void;
  startX?: number;
  startY?: number;
}

export const CoinAnimation = ({ amount, onComplete, startX = 0, startY = 0 }: CoinAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{ 
        left: startX || '50%', 
        top: startY || '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="animate-[fadeInUp_0.5s_ease-out,fadeOut_0.5s_ease-out_1.5s] flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg">
        <Coins className="h-5 w-5" />
        <span className="font-bold">+{amount.toLocaleString()}</span>
      </div>
    </div>
  );
};

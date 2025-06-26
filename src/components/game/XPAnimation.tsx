
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface XPAnimationProps {
  amount: number;
  onComplete: () => void;
}

export const XPAnimation = ({ amount, onComplete }: XPAnimationProps) => {
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
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 pointer-events-none z-50">
      <div className="animate-pulse">
        <div className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg">
          <Star className="h-4 w-4" />
          <span className="font-bold">+{amount} XP</span>
        </div>
      </div>
    </div>
  );
};

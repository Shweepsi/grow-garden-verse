
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface XPAnimationProps {
  amount: number;
  onComplete: () => void;
  startX?: number;
  startY?: number;
}

export const XPAnimation = ({ amount, onComplete, startX = 0, startY = 0 }: XPAnimationProps) => {
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
        top: (startY || 50) + 60,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="animate-[fadeInUp_0.5s_ease-out,fadeOut_0.5s_ease-out_1.5s] flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
        <Star className="h-5 w-5" />
        <span className="font-bold">+{amount} XP</span>
      </div>
    </div>
  );
};

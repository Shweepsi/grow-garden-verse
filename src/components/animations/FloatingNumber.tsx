
import React, { useEffect, useState, useCallback } from 'react';
import { FloatingAnimation } from '@/contexts/AnimationContext';
import { Coins, Star, Gem } from 'lucide-react';

interface FloatingNumberProps {
  animation: FloatingAnimation;
  onComplete: (id: string) => void;
}

// Mémorisation pour optimiser les performances
export const FloatingNumber = React.memo(({ animation, onComplete }: FloatingNumberProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Mémoriser le callback pour éviter les re-renders
  const handleComplete = useCallback(() => {
    onComplete(animation.id);
  }, [animation.id, onComplete]);

  useEffect(() => {
    // Animation plus courte pour mobile (1.5s au lieu de 2s)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Délai légèrement plus court pour le nettoyage
      setTimeout(handleComplete, 200);
    }, 1500);

    return () => clearTimeout(timer);
  }, [handleComplete]);

  const getIcon = () => {
    switch (animation.type) {
      case 'coins':
        return <Coins className="h-4 w-4 text-yellow-500" />;
      case 'experience':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'gems':
        return <Gem className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (animation.type) {
      case 'coins':
        return 'text-yellow-600';
      case 'experience':
        return 'text-blue-600';
      case 'gems':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        flex items-center gap-1 px-3 py-1 rounded-full 
        bg-white/90 backdrop-blur-sm shadow-lg border
        font-bold text-sm z-50 pointer-events-none
        transition-all duration-1500 ease-out
        ${getColor()}
        ${isVisible 
          ? 'animate-bounce opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-8'
        }
      `}
      style={{
        // Utiliser transform3d pour l'accélération GPU
        transform: `translate3d(-50%, ${isVisible ? '-50%' : '-80%'}, 0)`,
        willChange: 'transform, opacity'
      }}
    >
      {getIcon()}
      <span>+{animation.amount}</span>
    </div>
  );
});

FloatingNumber.displayName = 'FloatingNumber';

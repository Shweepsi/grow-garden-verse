
import { Coins, Sprout, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { useAnimations } from '@/contexts/AnimationContext';
import { FloatingNumber } from '@/components/animations/FloatingNumber';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden }: GameHeaderProps) => {
  const { animations } = useAnimations();

  // Calculer l'XP nécessaire pour le prochain niveau
  const getXpForLevel = (level: number) => {
    return Math.pow(level, 2) * 100;
  };

  const currentLevel = garden?.level || 1;
  const currentXp = garden?.experience || 0;
  const xpForCurrentLevel = getXpForLevel(currentLevel - 1);
  const xpForNextLevel = getXpForLevel(currentLevel);
  const xpProgress = currentXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((xpProgress / xpNeeded) * 100, 100);

  return (
    <div className="relative z-20">
      <div className="mx-3 mt-3 mb-2">
        <div className="glassmorphism rounded-xl p-3 shadow-xl">
          {/* Header principal - Layout mobile optimisé */}
          <div className="flex items-center justify-between mb-3">
            {/* Logo et titre - Plus compact */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Sprout className="h-4 w-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="mobile-text-lg font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                  Grow Garden
                </h1>
                <p className="mobile-text-xs text-gray-600">Cultivez votre paradis</p>
              </div>
            </div>
          </div>

          {/* Statistiques - Layout vertical sur mobile */}
          <div className="space-y-2">
            {/* Ligne 1: Coins, Gemmes et Niveau */}
            <div className="flex items-center justify-between space-x-2">
              {/* Coins avec zone d'animation */}
              <div className="relative group flex-1">
                <div className="premium-card rounded-lg px-2 py-1.5 flex items-center space-x-1.5 shimmer">
                  <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Coins className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="font-bold text-yellow-700 mobile-text-sm">
                    {(garden?.coins || 0) >= 1000000 
                      ? `${((garden?.coins || 0) / 1000000).toFixed(1)}M`
                      : (garden?.coins || 0) >= 1000
                      ? `${((garden?.coins || 0) / 1000).toFixed(1)}K`
                      : (garden?.coins || 0).toLocaleString()
                    }
                  </span>
                </div>
                
                {/* Zone d'animation pour les pièces */}
                <div className="animation-zone">
                  {animations
                    .filter(anim => anim.type === 'coins')
                    .map(anim => (
                      <FloatingNumber key={anim.id} animation={anim} />
                    ))
                  }
                </div>
              </div>

              {/* Gemmes */}
              <div className="relative group flex-1">
                <div className="premium-card rounded-lg px-2 py-1.5 flex items-center space-x-1.5">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">💎</span>
                  </div>
                  <span className="font-bold text-purple-700 mobile-text-sm">
                    {(garden?.gems || 0).toLocaleString()}
                  </span>
                </div>
                
                {/* Zone d'animation pour les gemmes */}
                <div className="animation-zone">
                  {animations
                    .filter(anim => anim.type === 'gems')
                    .map(anim => (
                      <FloatingNumber key={anim.id} animation={anim} />
                    ))
                  }
                </div>
              </div>
              
              {/* Niveau */}
              <div className="relative group flex-1">
                <div className="premium-card rounded-lg px-2 py-1.5 flex items-center space-x-1.5">
                  <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Star className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="font-bold text-blue-700 mobile-text-sm">
                    Niv. {currentLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Ligne 2: Barre d'XP avec pourcentage et animations */}
            <div className="relative premium-card rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="mobile-text-xs text-blue-600 font-medium">Expérience</span>
                <span className="mobile-text-xs text-blue-600 font-bold">
                  {Math.floor(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 relative"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="mobile-text-xs text-gray-500">
                  {xpProgress.toLocaleString()} XP
                </span>
                <span className="mobile-text-xs text-gray-500">
                  {xpNeeded.toLocaleString()} XP
                </span>
              </div>
              
              {/* Zone d'animation pour l'XP */}
              <div className="animation-zone">
                {animations
                  .filter(anim => anim.type === 'experience')
                  .map(anim => (
                    <FloatingNumber key={anim.id} animation={anim} />
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

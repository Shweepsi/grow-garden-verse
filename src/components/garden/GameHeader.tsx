import { Coins, Sprout, Star, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { useAnimations } from '@/contexts/AnimationContext';
import { FloatingNumber } from '@/components/animations/FloatingNumber';
import { AdRewardCard } from '@/components/ads/AdRewardCard';
import { AdModal } from '@/components/ads/AdModal';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Clock } from 'lucide-react';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden }: GameHeaderProps) => {
  const { animations } = useAnimations();
  const [showAdModal, setShowAdModal] = useState(false);
  const { availableRewards, adState } = useAdRewards();
  const { boosts, formatTimeRemaining, getTimeRemaining } = useActiveBoosts();

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
  const progressPercentage = Math.min(xpProgress / xpNeeded * 100, 100);

  const getBoostIcon = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return '🪙';
      case 'gem_boost': return '💎';
      case 'growth_boost': return '⚡';
      default: return '🎁';
    }
  };

  const getBoostLabel = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return 'Pièces ×2';
      case 'gem_boost': return 'Gemmes ×1.5';
      case 'growth_boost': return 'Croissance -50%';
      default: return 'Boost';
    }
  };

  // Debug pour comprendre l'état du bouton
  useEffect(() => {
    console.log('🎁 AdState Debug:', { 
      dailyCount: adState.dailyCount, 
      maxDaily: adState.maxDaily, 
      available: adState.available,
      shouldAnimate: adState.dailyCount < adState.maxDaily && adState.available
    });
  }, [adState]);

  return (
    <div className="relative z-20">
      <div className="mx-3 mt-3 mb-2">
        <div className="glassmorphism rounded-xl p-3 shadow-xl">
          {/* Header principal */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <img 
                  src="/lovable-uploads/638e9607-9375-4e7d-ac74-78944ea7cfe7.png" 
                  alt="Idle Grow Logo" 
                  className="h-8 w-8 object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="mobile-text-lg font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                  Idle Grow
                </h1>
              </div>
            </div>
          </div>

          {/* Boosts actifs - intégrés dans la ligne des stats */}

          {/* Statistiques */}
          <div className="space-y-2">
            {/* Ligne 1: Coins, Gemmes, Niveau et Boosts */}
            <div className="flex items-center justify-between space-x-2">
              {/* Coins avec zone d'animation */}
              <div className="relative group flex-1">
                <div className="premium-card rounded-lg px-2 py-1.5 flex items-center space-x-1.5 shimmer">
                  <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Coins className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="font-bold text-yellow-700 mobile-text-sm">
                    {(garden?.coins || 0) >= 1000000 ? `${((garden?.coins || 0) / 1000000).toFixed(1)}M` : (garden?.coins || 0) >= 1000 ? `${((garden?.coins || 0) / 1000).toFixed(1)}K` : (garden?.coins || 0).toLocaleString()}
                  </span>
                </div>
                
                {/* Zone d'animation pour les pièces */}
                <div className="animation-zone">
                  {animations.filter(anim => anim.type === 'coins').map(anim => <FloatingNumber key={anim.id} animation={anim} />)}
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
                  {animations.filter(anim => anim.type === 'gems').map(anim => <FloatingNumber key={anim.id} animation={anim} />)}
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

              {/* Boosts compacts avec tooltips */}
              {boosts.length > 0 && (
                <TooltipProvider>
                  <div className="flex space-x-1">
                    {boosts.slice(0, 2).map((boost) => (
                      <Tooltip key={boost.id}>
                        <TooltipTrigger asChild>
                          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-xs cursor-help hover:scale-110 transition-transform duration-200">
                            {getBoostIcon(boost.effect_type)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-semibold">{getBoostLabel(boost.effect_type)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeRemaining(getTimeRemaining(boost.expires_at))} restant
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {boosts.length > 2 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-xs text-white cursor-help hover:scale-110 transition-transform duration-200">
                            +{boosts.length - 2}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            {boosts.slice(2).map((boost) => (
                              <div key={boost.id} className="text-xs">
                                <span className="font-medium">{getBoostLabel(boost.effect_type)}</span>
                                <span className="text-muted-foreground ml-1">
                                  ({formatTimeRemaining(getTimeRemaining(boost.expires_at))})
                                </span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              )}

              {/* Bouton Publicité */}
              <Button
                size="sm"
                onClick={() => setShowAdModal(true)}
                className={`h-8 px-2 border-0 transition-all duration-300 ${
                  adState.dailyCount < adState.maxDaily && adState.available
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 shadow-lg shadow-orange-400/50' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-500 hover:to-gray-400'
                }`}
              >
                <Gift className="h-3 w-3 text-white" />
              </Button>
            </div>

            {/* Ligne 2: Barre d'XP ultra-compacte */}
            <div className="relative premium-card rounded-lg px-2 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600 font-medium">XP</span>
                <span className="text-blue-600 font-bold">
                  {Math.floor(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden mt-0.5">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 relative" style={{
                width: `${Math.max(0, Math.min(100, progressPercentage))}%`
              }}>
                  <div className="absolute inset-0 bg-white/20"></div>
                </div>
              </div>
              
              {/* Zone d'animation pour l'XP */}
              <div className="animation-zone">
                {animations.filter(anim => anim.type === 'experience').map(anim => <FloatingNumber key={anim.id} animation={anim} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal des publicités */}
      <AdModal open={showAdModal} onOpenChange={setShowAdModal} />
    </div>
  );
};

import { Coins, Sprout, Star, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { useAnimations } from '@/contexts/AnimationContext';
import { FloatingNumber } from '@/components/animations/FloatingNumber';
import { ClaimRewardButton } from '@/components/ads/ClaimRewardButton';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { useOptimisticGameData } from '@/hooks/useOptimisticGameData';
import { gameDataEmitter } from '@/hooks/useGameDataNotifier';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Clock } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { PremiumBadge } from '@/components/premium/PremiumBadge';


interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden: originalGarden }: GameHeaderProps) => {
  // Use optimistic game data for instant updates
  const { gameData: optimisticData, addOptimisticUpdate } = useOptimisticGameData();
  const garden = optimisticData?.garden || originalGarden;
  const { animations } = useAnimations();

const { rewardState } = useUnifiedRewards();
  const { isPremium } = usePremiumStatus();
  const { boosts, formatTimeRemaining, getTimeRemaining } = useActiveBoosts();
  const mounted = useRef(true);

// Track component mount/unmount to prevent state updates after unmount
useEffect(() => {
  mounted.current = true;
  return () => {
    mounted.current = false;
  };
}, []);

// Listen for reward claim events for instant visual feedback
useEffect(() => {
  const handleRewardClaimed = () => {
    // Force component re-render for instant feedback
    if (mounted.current) {
      // The optimistic data hook will handle the actual display updates
      console.log('🎉 Header notified of reward claim - will update display');
    }
  };

  gameDataEmitter.on('reward-claimed', handleRewardClaimed);
  gameDataEmitter.on('coins-claimed', handleRewardClaimed);
  gameDataEmitter.on('gems-claimed', handleRewardClaimed);

  return () => {
    gameDataEmitter.off('reward-claimed', handleRewardClaimed);
    gameDataEmitter.off('coins-claimed', handleRewardClaimed);
    gameDataEmitter.off('gems-claimed', handleRewardClaimed);
  };
}, []);

// Pas besoin de modal state pour le système unifié

  // Calculer l'XP nécessaire pour le prochain niveau
  const getXpForLevel = (level: number) => {
    return Math.pow(level, 2) * 100;
  };

  // Mémoisé pour éviter les recalculs inutiles
  const xpStats = useMemo(() => {
    const currentLevel = garden?.level || 1;
    const currentXp = garden?.experience || 0;
    const xpForCurrentLevel = getXpForLevel(currentLevel - 1);
    const xpForNextLevel = getXpForLevel(currentLevel);
    const xpProgress = currentXp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.min(xpProgress / xpNeeded * 100, 100);
    
    return { currentLevel, currentXp, progressPercentage };
  }, [garden?.level, garden?.experience]);

  // Mémoisé pour stabiliser l'état du bouton avec logique plus intelligente
  const adButtonState = useMemo(() => {
    // Protection contre les valeurs undefined
    if (!rewardState) {
      return {
        shouldAnimate: false,
        isDisabled: true,
        className: 'h-8 px-2.5 border-0 rounded-md flex items-center transition-all duration-300 bg-gradient-to-r from-gray-400 to-gray-300'
      };
    }

    // Pour Premium, toujours vérifier la limite même si l'état n'est pas encore chargé
    if (isPremium) {
      const dailyLimitReached = (rewardState.dailyCount || 0) >= (rewardState.maxDaily || 5);
      return {
        shouldAnimate: !dailyLimitReached,
        isDisabled: dailyLimitReached,
        className: `h-8 px-2.5 border-0 rounded-md flex items-center transition-all duration-300 ${
          dailyLimitReached
            ? 'bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-500 hover:to-gray-400 opacity-50'
            : 'bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-500 hover:to-amber-500'
        }`
      };
    }
    
    // Pour les utilisateurs non-Premium
    const dailyLimitReached = (rewardState.dailyCount || 0) >= (rewardState.maxDaily || 5);
    const shouldAnimate = !dailyLimitReached;
    return {
      shouldAnimate,
      isDisabled: dailyLimitReached,
      className: `h-8 px-2.5 border-0 transition-all duration-300 flex-shrink-0 transform-gpu ${
        shouldAnimate
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-400/50 plant-ready-bounce hover:scale-105 active:scale-95' 
          : 'bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-500 hover:to-gray-400'
      }`
    };
  }, [rewardState?.dailyCount, rewardState?.maxDaily, isPremium]);

  const getBoostIcon = (effectType: string) => {
    switch (effectType) {
      case 'coin_boost': return '🪙';
      case 'gem_boost': return '💎';
      case 'growth_speed':
      case 'growth_boost':
        return '⚡';
      default: return '🎁';
    }
  };

  const getBoostLabel = (effectType: string, effectValue: number) => {
    switch (effectType) {
      case 'coin_boost': return `Pièces ×${effectValue}`;
      case 'gem_boost': return `Gemmes ×${effectValue}`;
      case 'growth_speed':
      case 'growth_boost':
        return `Croissance -${Math.round((1 - (1/effectValue)) * 100)}%`;
      default: return 'Boost actif';
    }
  };

  return (
    <div className="relative z-20">
      <div className="mx-3 mt-3 mb-2">
        <div className="glassmorphism rounded-xl p-3 shadow-xl">
          {/* Header principal */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <img 
                  src="/ic_launcher.png" 
                  alt="Idle Grow Logo" 
                  className="h-8 w-8 object-contain rounded-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
              <div>
                <h1 className="mobile-text-lg font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                  Idle Grow
                </h1>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="space-y-1.5">
            {/* Ligne 1: Coins, Gemmes, Niveau */}
            <div className="flex items-center space-x-1.5">
              {/* Coins avec zone d'animation */}
              <div className="relative group flex-1">
                <div className="premium-card rounded-lg px-2 py-1 flex items-center space-x-1.5 shimmer">
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
                <div className="premium-card rounded-lg px-2 py-1 flex items-center space-x-1.5">
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
                <div className="premium-card rounded-lg px-2 py-1 flex items-center space-x-1.5">
                  <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Star className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="font-bold text-blue-700 mobile-text-sm">
                    Niv. {xpStats.currentLevel}
                  </span>
                </div>
                {/* Zone d'animation pour l'XP - Disabled */}
                <div className="animation-zone">
                  {/* XP animations are disabled */}
                </div>
              </div>

{/* Bouton Publicité / Premium - Unifié avec état stabilisé */}
              <ClaimRewardButton 
                variant="compact"
                className={adButtonState.className}
              />
            </div>


            {/* Ligne 3: Barre d'XP ultra-compacte */}
            <div className="relative premium-card rounded-lg px-2 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600 font-medium">XP</span>
                <span className="text-blue-600 font-bold">
                  {Math.floor(xpStats.progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden mt-0.5">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 relative" style={{
                width: `${Math.max(0, Math.min(100, xpStats.progressPercentage))}%`
              }}>
                  <div className="absolute inset-0 bg-white/20"></div>
                </div>
              </div>
            </div>

            {/* Boosts actifs - Icônes uniquement */}
            {boosts && boosts.length > 0 && (
              <div className="flex items-center gap-1">
                {boosts.map((boost) => (
                  <TooltipProvider key={boost.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                          <span className="text-sm">{getBoostIcon(boost.effect_type)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold">{getBoostLabel(boost.effect_type, boost.effect_value)}</p>
                          <p className="text-muted-foreground">Expire dans {formatTimeRemaining(getTimeRemaining(boost.expires_at))}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

{/* Modals - using safe state setter and conditional rendering */}
{mounted.current && (
   <></>
)}
    </div>
  );
};

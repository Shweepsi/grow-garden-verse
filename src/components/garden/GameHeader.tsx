import { Coins, Sprout, Star, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { useAnimations } from '@/contexts/AnimationContext';
import { FloatingNumber } from '@/components/animations/FloatingNumber';
import { AdRewardCard } from '@/components/ads/AdRewardCard';
import { AdModal } from '@/components/ads/AdModal';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Clock } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { PremiumRewardsDialog } from '@/components/ads/PremiumRewardsDialog';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden }: GameHeaderProps) => {
  const { animations } = useAnimations();
const [showAdModal, setShowAdModal] = useState(false);
const [showPremiumDialog, setShowPremiumDialog] = useState(false);
const { availableRewards, adState } = useAdRewards();
  const { isPremium } = usePremiumStatus();
  const { boosts, formatTimeRemaining, getTimeRemaining } = useActiveBoosts();
  const mounted = useRef(true);

  // Track component mount/unmount to prevent state updates after unmount
useEffect(() => {
  mounted.current = true;
  return () => {
    mounted.current = false;
    // Close modals when component unmounts to prevent crashes
    setShowAdModal(false);
    setShowPremiumDialog(false);
  };
}, []);

// Safe modal state setter that checks if component is mounted
const safeSetShowAdModal = useCallback((show: boolean) => {
  if (mounted.current) {
    setShowAdModal(show);
  }
}, []);
const safeSetShowPremiumDialog = useCallback((show: boolean) => {
  if (mounted.current) {
    setShowPremiumDialog(show);
  }
}, []);

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

  // Mémoisé pour stabiliser l'état du bouton
  const adButtonState = useMemo(() => {
    const shouldAnimate = adState.dailyCount < adState.maxDaily && adState.available;
    return {
      shouldAnimate,
      className: `h-8 px-2.5 border-0 transition-all duration-300 flex-shrink-0 transform-gpu ${
        shouldAnimate
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-400/50 plant-ready-bounce hover:scale-105 active:scale-95' 
          : 'bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-500 hover:to-gray-400'
      }`
    };
  }, [adState.dailyCount, adState.maxDaily, adState.available]);

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
          <div className="space-y-2">
            {/* Ligne 1: Coins, Gemmes, Niveau */}
            <div className="flex items-center space-x-2">
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
                    Niv. {xpStats.currentLevel}
                  </span>
                </div>
                {/* Zone d'animation pour l'XP */}
                <div className="animation-zone">
                  {animations.filter(anim => anim.type === 'experience').map(anim => <FloatingNumber key={anim.id} animation={anim} />)}
                </div>
              </div>

{/* Bouton Publicité / Premium */}
{isPremium ? (
  <Button
    size="sm"
    onClick={() => safeSetShowPremiumDialog(true)}
    className="h-8 px-2.5 border-0 rounded-md flex items-center bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-500 hover:to-amber-500"
  >
    <Gift className="h-3 w-3 text-white mr-1" />
    <span className="text-white mobile-text-xs">Récompenses</span>
  </Button>
) : (
  <Button
    size="sm"
    onClick={() => safeSetShowAdModal(true)}
    className={adButtonState.className}
  >
    <Gift className="h-3 w-3 text-white" />
  </Button>
)}
            </div>

            {/* Ligne 2: Boosts actifs (si présents) */}
            {boosts && boosts.length > 0 && (
              <div className="premium-card rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                      <Zap className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className="mobile-text-sm font-semibold text-orange-700">Boosts actifs</span>
                  </div>
                  <span className="mobile-text-xs text-orange-600 font-medium">
                    {boosts.length} actif{boosts.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <TooltipProvider>
                  <div className="flex flex-wrap gap-1.5">
                    {boosts.slice(0, 2).map((boost) => (
                      <Tooltip key={boost.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-2.5 py-1.5 rounded-lg cursor-help hover:from-orange-100 hover:to-amber-100 hover:border-orange-300 transition-all duration-200 min-w-0 flex-1">
                            <span className="text-sm">{getBoostIcon(boost.effect_type)}</span>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="mobile-text-xs font-semibold text-orange-700 truncate">
                                {getBoostLabel(boost.effect_type, boost.effect_value)}
                              </span>
                              <span className="mobile-text-xs text-orange-600">
                                {formatTimeRemaining(getTimeRemaining(boost.expires_at))}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                         <TooltipContent>
                           <div className="text-center">
                             <p className="font-semibold">{getBoostLabel(boost.effect_type, boost.effect_value)}</p>
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
                          <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-lg cursor-help hover:from-gray-100 hover:to-slate-100 hover:border-gray-300 transition-all duration-200 min-w-[60px]">
                            <span className="mobile-text-xs font-semibold text-gray-700">
                              +{boosts.length - 2}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2 max-w-48">
                            <p className="font-semibold text-center">Autres boosts actifs</p>
                            {boosts.slice(2).map((boost) => (
                              <div key={boost.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1 last:border-b-0">
                                <div className="flex items-center space-x-1">
                                  <span>{getBoostIcon(boost.effect_type)}</span>
                                  <span className="font-medium">{getBoostLabel(boost.effect_type, boost.effect_value)}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {formatTimeRemaining(getTimeRemaining(boost.expires_at))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}

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
          </div>
        </div>
      </div>

{/* Modals - using safe state setter and conditional rendering */}
{mounted.current && (
  <>
    <AdModal 
      open={showAdModal} 
      onOpenChange={safeSetShowAdModal}
    />
    <PremiumRewardsDialog
      open={showPremiumDialog}
      onOpenChange={safeSetShowPremiumDialog}
      playerLevel={xpStats.currentLevel}
    />
  </>
)}
    </div>
  );
};

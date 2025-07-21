import { Coins, Sprout, Star, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { useAnimations } from '@/contexts/AnimationContext';
import { FloatingNumber } from '@/components/animations/FloatingNumber';
import { AdRewardCard } from '@/components/ads/AdRewardCard';
import { AdModal } from '@/components/ads/AdModal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { Badge } from '@/components/ui/badge';
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

          {/* Boosts actifs */}
          {boosts.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {boosts.map((boost) => (
                  <Badge 
                    key={boost.id} 
                    variant="outline" 
                    className="text-xs bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 animate-pulse"
                  >
                    <span className="mr-1">{getBoostIcon(boost.effect_type)}</span>
                    {getBoostLabel(boost.effect_type)}
                    <Clock className="h-3 w-3 ml-1" />
                    {formatTimeRemaining(getTimeRemaining(boost.expires_at))}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques */}
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

              {/* Bouton Publicité */}
              <Button
                size="sm"
                onClick={() => setShowAdModal(true)}
                className={`h-8 px-2 border-0 relative overflow-hidden transition-all duration-300 ${
                  adState.dailyCount < adState.maxDaily && adState.available
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 shadow-lg shadow-orange-400/50 animate-bounce-slow hover:scale-110' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-500 hover:to-gray-400'
                }`}
              >
                <Gift className={`h-3 w-3 transition-transform duration-200 ${
                  adState.dailyCount < adState.maxDaily && adState.available ? 'animate-pulse text-white' : ''
                }`} />
                {adState.dailyCount < adState.maxDaily && adState.available && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-300/40 to-orange-200/40 animate-pulse" />
                    <div className="absolute -inset-1 bg-orange-400/20 rounded-lg animate-ping" />
                  </>
                )}
              </Button>
            </div>

            {/* Ligne 2: Barre d'XP */}
            <div className="relative premium-card rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="mobile-text-xs text-blue-600 font-medium">Expérience</span>
                <span className="mobile-text-xs text-blue-600 font-bold">
                  {Math.floor(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 relative" style={{
                width: `${Math.max(0, Math.min(100, progressPercentage))}%`
              }}>
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

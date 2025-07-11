
import { useUpgrades } from '@/hooks/useUpgrades';
import { useGameData } from '@/hooks/useGameData';
import { GameHeader } from '@/components/game/GameHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Gem, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { LevelUpgrade } from '@/types/upgrades';

export const UpgradesPage = () => {
  const {
    data: gameData
  } = useGameData();
  const {
    upgradesLoading,
    purchaseUpgrade,
    isUpgradePurchased,
    getSequentialUpgrades,
    getCategoryProgress,
    getCategoryDisplayName,
    isPurchasing
  } = useUpgrades();
  const playerLevel = gameData?.garden?.level || 1;
  const coins = gameData?.garden?.coins || 0;
  const gems = gameData?.garden?.gems || 0;

  // Obtenir les améliorations séquentielles et les infos de progression
  const sequentialUpgrades = getSequentialUpgrades();
  const categoryProgress = getCategoryProgress();
  
  const getEffectTypeColor = (effectType: string) => {
    if (effectType.includes('harvest')) return 'bg-yellow-500/20 text-yellow-700 border-yellow-300';
    if (effectType.includes('growth')) return 'bg-blue-500/20 text-blue-700 border-blue-300';
    if (effectType.includes('exp')) return 'bg-purple-500/20 text-purple-700 border-purple-300';
    if (effectType.includes('auto')) return 'bg-green-500/20 text-green-700 border-green-300';
    if (effectType.includes('cost_reduction')) return 'bg-orange-500/20 text-orange-700 border-orange-300';
    if (effectType.includes('gem')) return 'bg-pink-500/20 text-pink-700 border-pink-300';
    return 'bg-gray-500/20 text-gray-700 border-gray-300';
  };
  
  const canPurchase = (upgrade: LevelUpgrade) => {
    const hasLevel = playerLevel >= upgrade.level_required;
    const hasCoins = coins >= upgrade.cost_coins + 100; // Protection 100 pièces
    const hasGems = gems >= upgrade.cost_gems;
    const notPurchased = !isUpgradePurchased(upgrade.id);
    return hasLevel && hasCoins && hasGems && notPurchased;
  };
  
  const getButtonState = (upgrade: LevelUpgrade) => {
    if (isUpgradePurchased(upgrade.id)) return {
      text: 'Acheté ✓',
      style: 'bg-green-600'
    };
    if (playerLevel < upgrade.level_required) return {
      text: 'Verrouillé',
      style: 'bg-gray-400'
    };
    if (coins < upgrade.cost_coins + 100) return {
      text: 'Pas assez de pièces',
      style: 'bg-red-400'
    };
    if (gems < upgrade.cost_gems) return {
      text: 'Pas assez de gemmes',
      style: 'bg-red-400'
    };
    if (isPurchasing) return {
      text: 'Achat...',
      style: 'bg-blue-400'
    };
    return {
      text: 'Acheter',
      style: 'bg-blue-600 hover:bg-blue-700'
    };
  };
  
  if (upgradesLoading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen garden-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameData?.garden} />
      </div>
      
      {/* Content with padding to avoid overlap */}
      <div className="px-4 pb-6 space-y-6">
        {/* Titre et explication */}
        <div className="glassmorphism rounded-xl p-4 text-center">
          <h2 className="text-xl font-bold text-green-800 mb-2">🚀 Améliorations Disponibles</h2>
          <p className="text-green-600 text-sm">
            Achetez une amélioration pour débloquer la suivante dans chaque catégorie
          </p>
        </div>

        {/* Progression par catégorie */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(categoryProgress).map(([effectType, progress]) => (
            <div key={effectType} className="glassmorphism rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-green-800 mb-1">
                {progress.name}
              </div>
              <div className="text-xs text-green-600">
                {progress.purchased}/{progress.total}
              </div>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.purchased / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Grille des prochaines améliorations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequentialUpgrades.map(upgrade => {
            const isPurchased = isUpgradePurchased(upgrade.id);
            const isLocked = playerLevel < upgrade.level_required;
            const canBuy = canPurchase(upgrade);
            const buttonState = getButtonState(upgrade);
            
            return (
              <Card 
                key={upgrade.id} 
                className={`glassmorphism transition-all hover:scale-105 ${
                  isPurchased ? 'ring-2 ring-green-400' : 
                  isLocked ? 'opacity-60' : 
                  canBuy ? 'ring-2 ring-blue-400 shadow-lg' : 
                  'ring-1 ring-red-300'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{upgrade.emoji}</span>
                      <div>
                        <CardTitle className="text-lg text-green-800">{upgrade.display_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`${getEffectTypeColor(upgrade.effect_type)}`}>
                            Niveau {upgrade.level_required}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            {getCategoryDisplayName(upgrade.effect_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {isPurchased && <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />}
                    {isLocked && <Lock className="h-6 w-6 text-gray-400 flex-shrink-0" />}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-green-700 leading-relaxed">{upgrade.description}</p>
                  
                  <div className="space-y-3">
                    {/* Coût */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        {upgrade.cost_coins > 0 && (
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            <span className={`font-medium ${coins >= upgrade.cost_coins + 100 ? 'text-green-600' : 'text-red-500'}`}>
                              {upgrade.cost_coins.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {upgrade.cost_gems > 0 && (
                          <div className="flex items-center gap-2">
                            <Gem className="h-4 w-4 text-purple-600" />
                            <span className={`font-medium ${gems >= upgrade.cost_gems ? 'text-green-600' : 'text-red-500'}`}>
                              {upgrade.cost_gems.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bouton d'achat */}
                    <Button 
                      size="sm" 
                      disabled={!canBuy || isPurchased || isPurchasing} 
                      onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)} 
                      className={`w-full ${buttonState.style} transition-all`}
                    >
                      {buttonState.text}
                    </Button>

                    {/* Message d'aide */}
                    {!isPurchased && coins < upgrade.cost_coins + 100 && coins >= upgrade.cost_coins && (
                      <p className="text-xs text-orange-600 text-center">
                        💡 Gardez 100 pièces de réserve pour continuer à planter
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sequentialUpgrades.length === 0 && (
          <div className="glassmorphism rounded-2xl p-8 text-center">
            <p className="text-green-700 text-lg">
              🎉 Toutes les améliorations disponibles ont été débloquées !
            </p>
            <p className="text-green-600 text-sm mt-2">
              Continuez à progresser pour débloquer de nouvelles améliorations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

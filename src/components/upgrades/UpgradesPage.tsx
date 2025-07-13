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
    getCategoryTiers,
    isPurchasing
  } = useUpgrades();
  const playerLevel = gameData?.garden?.level || 1;
  const coins = gameData?.garden?.coins || 0;
  const gems = gameData?.garden?.gems || 0;

  // Obtenir les améliorations par catégorie et les infos de progression
  const sequentialUpgrades = getSequentialUpgrades();
  const categoryProgress = getCategoryProgress();

  // Grouper les améliorations par type d'effet pour afficher les paliers
  const upgradesByCategory = sequentialUpgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.effect_type]) {
      acc[upgrade.effect_type] = [];
    }
    acc[upgrade.effect_type].push(upgrade);
    return acc;
  }, {} as Record<string, LevelUpgrade[]>);
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
    return <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>;
  }
  return <div className="min-h-screen garden-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameData?.garden} />
      </div>
      
      {/* Content with padding to avoid overlap */}
      <div className="px-4 pb-6 space-y-6">
        {/* Titre et explication */}
        

        {/* Progression par catégorie */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(categoryProgress).map(([effectType, progress]) => <Card key={effectType} className="glassmorphism p-3 text-center">
              <div className="text-xs text-green-600 mb-1">{progress.name}</div>
              <div className="text-sm font-bold text-green-800">
                {progress.purchased}/{progress.total}
              </div>
            </Card>)}
        </div>

        {/* Améliorations avec paliers par catégorie */}
        <div className="space-y-6">
          {Object.entries(upgradesByCategory).map(([effectType, upgrades]) => {
          // Trouver le palier actuellement débloqué (le plus récent acheté)
          const purchasedUpgrades = upgrades.filter(u => isUpgradePurchased(u.id));
          const currentTier = purchasedUpgrades.length > 0 ? purchasedUpgrades.sort((a, b) => b.level_required - a.level_required)[0] : null;
          return <Card key={effectType} className="glassmorphism">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{upgrades[0].emoji}</span>
                    <div>
                      <CardTitle className="text-xl text-green-800">
                        {getCategoryDisplayName(effectType)}
                      </CardTitle>
                      <p className="text-sm text-green-600 mt-1">
                        {upgrades[0].description}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Liste des paliers dans la même carte */}
                  <div className="space-y-2">
                    {upgrades.map((upgrade, index) => {
                      const isPurchased = isUpgradePurchased(upgrade.id);
                      const isLocked = playerLevel < upgrade.level_required;
                      const canBuy = canPurchase(upgrade);
                      const buttonState = getButtonState(upgrade);
                      const isCurrentTier = currentTier?.id === upgrade.id;
                      
                      return (
                        <div key={upgrade.id} className={`p-3 rounded-lg border transition-all ${
                          isCurrentTier 
                            ? 'bg-green-50 border-green-300 ring-1 ring-green-200' 
                            : isPurchased 
                              ? 'bg-gray-50 border-gray-300' 
                              : isLocked 
                                ? 'bg-gray-50 border-gray-200 opacity-60' 
                                : canBuy 
                                  ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' 
                                  : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            {/* Info du palier */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                  Palier {index + 1}
                                </Badge>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 border-purple-300">
                                  Niv. {upgrade.level_required}+
                                </Badge>
                                {isCurrentTier && (
                                  <Badge className="text-xs px-2 py-0.5 bg-green-600 text-white">
                                    Actuel
                                  </Badge>
                                )}
                                {isPurchased && !isCurrentTier && (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                                {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                              </div>
                              
                              <div className="text-sm text-gray-700">
                                <strong>{upgrade.display_name}</strong>
                              </div>
                            </div>

                            {/* Coût et bouton */}
                            <div className="flex items-center gap-3">
                              {/* Coût */}
                              <div className="text-right space-y-0.5 text-xs">
                                {upgrade.cost_coins > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Coins className="h-3 w-3 text-yellow-600" />
                                    <span className={`font-medium ${
                                      coins >= upgrade.cost_coins + 100 ? 'text-green-600' : 'text-red-500'
                                    }`}>
                                      {upgrade.cost_coins.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {upgrade.cost_gems > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Gem className="h-3 w-3 text-purple-600" />
                                    <span className={`font-medium ${
                                      gems >= upgrade.cost_gems ? 'text-green-600' : 'text-red-500'
                                    }`}>
                                      {upgrade.cost_gems.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Bouton */}
                              <Button 
                                size="sm" 
                                disabled={!canBuy || isPurchased || isPurchasing} 
                                onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)} 
                                className={`${buttonState.style} transition-all text-xs px-3 py-1 h-7`}
                              >
                                {buttonState.text}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Message d'aide */}
                          {!isPurchased && coins < upgrade.cost_coins + 100 && coins >= upgrade.cost_coins && (
                            <p className="text-xs text-orange-600 mt-1">
                              💡 Gardez 100 pièces de réserve pour continuer à planter
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>

        {sequentialUpgrades.length === 0 && <div className="glassmorphism rounded-2xl p-8 text-center">
            <p className="text-green-700 text-lg">
              🎉 Toutes les améliorations disponibles ont été débloquées !
            </p>
            <p className="text-green-600 text-sm mt-2">
              Continuez à progresser pour débloquer de nouvelles améliorations.
            </p>
          </div>}
      </div>
    </div>;
};
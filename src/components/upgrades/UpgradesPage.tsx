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

  // Fonction pour obtenir le niveau actuel d'une catégorie (prochaine amélioration à acheter)
  const getCurrentUpgrade = (upgrades: LevelUpgrade[]) => {
    const sortedUpgrades = upgrades.sort((a, b) => a.level_required - b.level_required);
    // Trouver la première amélioration non achetée
    const nextUpgrade = sortedUpgrades.find(upgrade => !isUpgradePurchased(upgrade.id));
    return nextUpgrade || sortedUpgrades[sortedUpgrades.length - 1]; // Si tout est acheté, retourner la dernière
  };

  // Fonction pour obtenir le niveau actuel (combien d'améliorations achetées + 1)
  const getCurrentLevel = (upgrades: LevelUpgrade[]) => {
    const purchasedCount = upgrades.filter(upgrade => isUpgradePurchased(upgrade.id)).length;
    return purchasedCount + 1;
  };

  // Fonction pour vérifier si toutes les améliorations d'une catégorie sont achetées
  const isMaxLevel = (upgrades: LevelUpgrade[]) => {
    return upgrades.every(upgrade => isUpgradePurchased(upgrade.id));
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
      <div className="px-3 pb-4 space-y-4">
        {/* Progression par catégorie */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(categoryProgress).map(([effectType, progress]) => (
            <div key={effectType} className="text-center p-2 bg-white rounded-lg border">
              <div className="text-xs font-medium text-gray-600 capitalize">
                {effectType.replace('_', ' ')}
              </div>
              <div className="text-sm font-bold text-blue-600">
                {progress.purchased}/{progress.total}
              </div>
            </div>
          ))}
        </div>

        {/* Cartes évolutives par catégorie */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(upgradesByCategory).map(([effectType, upgrades]) => {
          const currentUpgrade = getCurrentUpgrade(upgrades);
          const currentLevel = getCurrentLevel(upgrades);
          const maxLevel = isMaxLevel(upgrades);
          const totalLevels = upgrades.length;
          const isPurchased = isUpgradePurchased(currentUpgrade.id);
          const isLocked = playerLevel < currentUpgrade.level_required;
          const canBuy = canPurchase(currentUpgrade);
          const buttonState = getButtonState(currentUpgrade);
          return <Card key={effectType} className={`glassmorphism relative overflow-hidden transition-all duration-500 hover:scale-105 ${maxLevel ? 'bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-200 shadow-green-100' : canBuy ? 'bg-gradient-to-br from-blue-50/80 to-cyan-50/80 border-blue-200 shadow-blue-100 hover:shadow-blue-200' : isLocked ? 'bg-gradient-to-br from-gray-50/80 to-slate-50/80 border-gray-200 opacity-75' : 'bg-gradient-to-br from-orange-50/80 to-red-50/80 border-orange-200'}`}>
                {/* Indicateur de niveau en arrière-plan */}
                <div className="absolute top-2 right-2 z-0">
                  <div className={`text-6xl font-bold opacity-10 ${maxLevel ? 'text-green-600' : 'text-blue-600'}`}>
                    {maxLevel ? 'MAX' : currentLevel}
                  </div>
                </div>

                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl drop-shadow-lg">{currentUpgrade.emoji}</span>
                      <div>
                        <CardTitle className="text-lg text-green-800 font-bold">
                          {getCategoryDisplayName(effectType)}
                        </CardTitle>
                        
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression des niveaux */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-white/50 rounded-full h-2 overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${maxLevel ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-cyan-500'}`} style={{
                    width: `${(currentLevel - 1) / totalLevels * 100}%`
                  }} />
                    </div>
                    <Badge variant="outline" className={`text-xs font-bold ${maxLevel ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
                      {maxLevel ? 'MAX' : `${currentLevel}/${totalLevels}`}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 pt-0">
                  {!maxLevel ? <>
                      {/* Titre du niveau actuel */}
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-gray-800 mb-1">
                          Niveau {currentLevel}: {currentUpgrade.display_name}
                        </h3>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          Requis: Niveau {currentUpgrade.level_required}
                        </Badge>
                      </div>

                      {/* Coûts */}
                      <div className="flex justify-center gap-4 mb-4">
                        {currentUpgrade.cost_coins > 0 && <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            <span className={`font-bold text-sm ${coins >= currentUpgrade.cost_coins + 100 ? 'text-green-600' : 'text-red-500'}`}>
                              {currentUpgrade.cost_coins.toLocaleString()}
                            </span>
                          </div>}
                        {currentUpgrade.cost_gems > 0 && <div className="flex items-center gap-1">
                            <Gem className="h-4 w-4 text-purple-600" />
                            <span className={`font-bold text-sm ${gems >= currentUpgrade.cost_gems ? 'text-green-600' : 'text-red-500'}`}>
                              {currentUpgrade.cost_gems.toLocaleString()}
                            </span>
                          </div>}
                      </div>

                      {/* Bouton d'achat */}
                      <Button size="lg" disabled={!canBuy || isPurchased || isPurchasing} onClick={() => purchaseUpgrade(currentUpgrade.id, currentUpgrade.cost_coins, currentUpgrade.cost_gems)} className={`w-full font-bold text-sm py-2 transition-all duration-300 ${buttonState.style} ${canBuy ? 'hover:scale-105 hover:shadow-lg' : ''}`}>
                        {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isLocked ? <Lock className="h-4 w-4 mr-2" /> : null}
                        {buttonState.text}
                      </Button>

                      {/* Message d'aide pour réserve */}
                      {!isPurchased && coins < currentUpgrade.cost_coins + 100 && coins >= currentUpgrade.cost_coins && <p className="text-xs text-orange-600 mt-2 text-center animate-pulse">
                          💡 Gardez 100 pièces de réserve
                        </p>}
                    </> : (/* Carte niveau maximum */
              <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2 animate-bounce" />
                      <h3 className="font-bold text-green-800 text-lg mb-1">
                        Niveau Maximum Atteint!
                      </h3>
                      <p className="text-green-600 text-sm">
                        Toutes les améliorations de cette catégorie sont débloquées
                      </p>
                    </div>)}
                </CardContent>

                {/* Effet de brillance pour les cartes disponibles */}
                {canBuy && !maxLevel && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse" />}
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
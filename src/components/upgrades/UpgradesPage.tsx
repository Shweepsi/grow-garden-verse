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
    return <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header fixe Adventure Capitalist style */}
      <div className="sticky top-0 z-40 bg-white border-b-2 border-green-600 shadow-lg">
        <GameHeader garden={gameData?.garden} />
      </div>
      
      {/* Titre principal */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center">🏪 MAGASIN D'AMÉLIORATIONS</h1>
          <p className="text-center mt-2 text-green-100">Achetez des améliorations pour booster votre jardin</p>
        </div>
      </div>

      {/* Liste des améliorations style Adventure Capitalist */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {sequentialUpgrades.map(upgrade => {
            const isPurchased = isUpgradePurchased(upgrade.id);
            const isLocked = playerLevel < upgrade.level_required;
            const canBuy = canPurchase(upgrade);
            const buttonState = getButtonState(upgrade);
            
            return (
              <div 
                key={upgrade.id} 
                className={`
                  bg-white rounded-lg border-2 shadow-md transition-all duration-200
                  ${isPurchased ? 'border-green-500 bg-green-50' : 
                    isLocked ? 'border-gray-300 bg-gray-50 opacity-60' : 
                    canBuy ? 'border-blue-500 shadow-lg hover:shadow-xl' : 
                    'border-red-300 bg-red-50'}
                `}
              >
                <div className="flex items-center p-4">
                  {/* Icône et info */}
                  <div className="flex items-center flex-1 gap-4">
                    <div className="text-4xl">{upgrade.emoji}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-800">{upgrade.display_name}</h3>
                        {isPurchased && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {isLocked && <Lock className="h-5 w-5 text-gray-400" />}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{upgrade.description}</p>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={`${getEffectTypeColor(upgrade.effect_type)} font-medium`}>
                          Niveau {upgrade.level_required}
                        </Badge>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          {getCategoryDisplayName(upgrade.effect_type)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Coût et bouton */}
                  <div className="flex items-center gap-6">
                    {/* Affichage du coût */}
                    <div className="text-right">
                      {upgrade.cost_coins > 0 && (
                        <div className="flex items-center gap-2 mb-1">
                          <Coins className="h-5 w-5 text-yellow-600" />
                          <span 
                            className={`text-lg font-bold ${
                              coins >= upgrade.cost_coins + 100 ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            {upgrade.cost_coins.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {upgrade.cost_gems > 0 && (
                        <div className="flex items-center gap-2">
                          <Gem className="h-5 w-5 text-purple-600" />
                          <span 
                            className={`text-lg font-bold ${
                              gems >= upgrade.cost_gems ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            {upgrade.cost_gems.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bouton d'achat Adventure Capitalist style */}
                    <Button
                      size="lg"
                      disabled={!canBuy || isPurchased || isPurchasing}
                      onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)}
                      className={`
                        min-w-[120px] h-12 text-white font-bold border-2 border-white/20 shadow-lg
                        ${isPurchased ? 'bg-green-600 hover:bg-green-700' :
                          isLocked ? 'bg-gray-400' :
                          canBuy ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105' :
                          'bg-red-500 hover:bg-red-600'}
                        transition-all duration-200
                      `}
                    >
                      {buttonState.text}
                    </Button>
                  </div>
                </div>

                {/* Message d'aide si nécessaire */}
                {!isPurchased && coins < upgrade.cost_coins + 100 && coins >= upgrade.cost_coins && (
                  <div className="bg-orange-100 border-t-2 border-orange-300 px-4 py-2">
                    <p className="text-sm text-orange-700 text-center font-medium">
                      💡 Gardez 100 pièces de réserve pour continuer à planter
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Message si pas d'améliorations */}
        {sequentialUpgrades.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-green-500 p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-green-700 mb-2">
              Toutes les améliorations disponibles ont été débloquées !
            </p>
            <p className="text-green-600">
              Continuez à progresser pour débloquer de nouvelles améliorations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
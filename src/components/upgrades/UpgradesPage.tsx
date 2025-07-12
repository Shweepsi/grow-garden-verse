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
        <div className="space-y-2">
          {sequentialUpgrades.map(upgrade => {
            const isPurchased = isUpgradePurchased(upgrade.id);
            const isLocked = playerLevel < upgrade.level_required;
            const canBuy = canPurchase(upgrade);
            
            return (
              <div 
                key={upgrade.id} 
                className={`
                  relative bg-gradient-to-r rounded-lg shadow-lg border-2 overflow-hidden transition-all duration-200
                  ${isPurchased ? 
                    'from-green-400 to-green-600 border-green-300 shadow-green-200' : 
                    isLocked ? 
                    'from-gray-300 to-gray-400 border-gray-200 opacity-70' : 
                    canBuy ? 
                    'from-blue-400 to-blue-600 border-blue-300 shadow-blue-200 hover:shadow-xl hover:scale-[1.02]' : 
                    'from-red-400 to-red-600 border-red-300 shadow-red-200'}
                  h-20
                `}
              >
                {/* Carte style Adventure Capitalist */}
                <div className="flex items-center h-full px-4">
                  {/* Icône gauche */}
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mr-4 border border-white/30">
                    <span className="text-3xl">{upgrade.emoji}</span>
                  </div>
                  
                  {/* Nom et description */}
                  <div className="flex-1 text-white">
                    <h3 className="text-lg font-bold leading-tight mb-1">{upgrade.display_name}</h3>
                    <p className="text-sm text-white/90 leading-tight">{upgrade.description}</p>
                  </div>
                  
                  {/* Coût */}
                  <div className="text-right mr-4">
                    {upgrade.cost_coins > 0 && (
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <span 
                          className={`text-xl font-bold ${
                            coins >= upgrade.cost_coins + 100 ? 'text-white' : 'text-red-200'
                          }`}
                        >
                          {upgrade.cost_coins.toLocaleString()}
                        </span>
                        <Coins className="h-5 w-5 text-yellow-300" />
                      </div>
                    )}
                    {upgrade.cost_gems > 0 && (
                      <div className="flex items-center gap-2 justify-end">
                        <span 
                          className={`text-xl font-bold ${
                            gems >= upgrade.cost_gems ? 'text-white' : 'text-red-200'
                          }`}
                        >
                          {upgrade.cost_gems.toLocaleString()}
                        </span>
                        <Gem className="h-5 w-5 text-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* Bouton/Status */}
                  <div className="w-24">
                    {isPurchased ? (
                      <div className="bg-white/20 rounded-lg px-3 py-2 text-center border border-white/30">
                        <CheckCircle className="h-6 w-6 text-white mx-auto" />
                        <span className="text-xs text-white font-bold">ACHETÉ</span>
                      </div>
                    ) : isLocked ? (
                      <div className="bg-black/20 rounded-lg px-3 py-2 text-center border border-white/20">
                        <Lock className="h-6 w-6 text-white/60 mx-auto" />
                        <span className="text-xs text-white/60 font-bold">LVL {upgrade.level_required}</span>
                      </div>
                    ) : (
                      <Button
                        disabled={!canBuy || isPurchasing}
                        onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)}
                        className="w-full h-12 bg-white/20 hover:bg-white/30 text-white font-bold border border-white/30 rounded-lg transition-all duration-200"
                      >
                        {isPurchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : canBuy ? (
                          'ACHETER'
                        ) : (
                          'MANQUE'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Niveau requis badge */}
                <div className="absolute top-2 left-2 bg-black/30 px-2 py-1 rounded text-xs text-white font-bold">
                  LVL {upgrade.level_required}
                </div>

                {/* Message d'aide si nécessaire */}
                {!isPurchased && coins < upgrade.cost_coins + 100 && coins >= upgrade.cost_coins && (
                  <div className="absolute bottom-0 left-0 right-0 bg-orange-500/90 px-2 py-1">
                    <p className="text-xs text-white text-center font-medium">
                      💡 Gardez 100 pièces de réserve
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
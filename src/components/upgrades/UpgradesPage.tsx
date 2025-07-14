import { useUpgrades } from '@/hooks/useUpgrades';
import { useGameData } from '@/hooks/useGameData';
import { GameHeader } from '@/components/game/GameHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Gem, Lock, CheckCircle, Loader2, Sparkles } from 'lucide-react';
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

  const getEffectTypeGradient = (effectType: string) => {
    if (effectType.includes('harvest')) return 'from-yellow-400/20 to-amber-500/20 border-yellow-400/30';
    if (effectType.includes('growth')) return 'from-blue-400/20 to-cyan-500/20 border-blue-400/30';
    if (effectType.includes('exp')) return 'from-purple-400/20 to-violet-500/20 border-purple-400/30';
    if (effectType.includes('auto')) return 'from-green-400/20 to-emerald-500/20 border-green-400/30';
    if (effectType.includes('cost_reduction')) return 'from-orange-400/20 to-red-500/20 border-orange-400/30';
    if (effectType.includes('gem')) return 'from-pink-400/20 to-rose-500/20 border-pink-400/30';
    return 'from-gray-400/20 to-slate-500/20 border-gray-400/30';
  };

  const canPurchase = (upgrade: LevelUpgrade) => {
    const hasLevel = playerLevel >= upgrade.level_required;
    const hasCoins = coins >= upgrade.cost_coins + 100;
    const hasGems = gems >= upgrade.cost_gems;
    const notPurchased = !isUpgradePurchased(upgrade.id);
    return hasLevel && hasCoins && hasGems && notPurchased;
  };

  const getButtonState = (upgrade: LevelUpgrade) => {
    if (isUpgradePurchased(upgrade.id)) return {
      text: 'Acheté',
      style: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
      icon: <CheckCircle className="h-3 w-3" />
    };
    if (playerLevel < upgrade.level_required) return {
      text: 'Verrouillé',
      style: 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200',
      icon: <Lock className="h-3 w-3" />
    };
    if (coins < upgrade.cost_coins + 100) return {
      text: 'Insuffisant',
      style: 'bg-gradient-to-r from-red-400 to-red-500 text-white',
      icon: <Coins className="h-3 w-3" />
    };
    if (gems < upgrade.cost_gems) return {
      text: 'Insuffisant',
      style: 'bg-gradient-to-r from-red-400 to-red-500 text-white',
      icon: <Gem className="h-3 w-3" />
    };
    if (isPurchasing) return {
      text: 'Achat...',
      style: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white',
      icon: <Loader2 className="h-3 w-3 animate-spin" />
    };
    return {
      text: 'Acheter',
      style: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105',
      icon: <Sparkles className="h-3 w-3" />
    };
  };

  if (upgradesLoading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-lg font-medium text-primary">Chargement des améliorations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen garden-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/10 border-b border-white/20">
        <GameHeader garden={gameData?.garden} />
      </div>
      
      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Progression compacte */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(categoryProgress).map(([effectType, progress]) => (
            <div 
              key={effectType} 
              className={`glassmorphism rounded-xl p-3 text-center animate-fade-in bg-gradient-to-br ${getEffectTypeGradient(effectType)} hover:scale-105 transition-all duration-300`}
            >
              <div className="text-xs font-medium text-foreground/80 mb-1">{progress.name}</div>
              <div className="text-lg font-bold text-foreground">
                {progress.purchased}/{progress.total}
              </div>
              <div className="w-full bg-black/20 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gradient-to-r from-primary to-primary/80 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(progress.purchased / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Améliorations par catégorie */}
        <div className="space-y-6">
          {Object.entries(upgradesByCategory).map(([effectType, upgrades]) => {
            const purchasedUpgrades = upgrades.filter(u => isUpgradePurchased(u.id));
            const currentTier = purchasedUpgrades.length > 0 
              ? purchasedUpgrades.sort((a, b) => b.level_required - a.level_required)[0] 
              : null;

            return (
              <Card key={effectType} className={`glassmorphism border-0 bg-gradient-to-br ${getEffectTypeGradient(effectType)} animate-fade-in hover:shadow-2xl transition-all duration-500`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl animate-bounce">{upgrades[0].emoji}</div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {getCategoryDisplayName(effectType)}
                      </CardTitle>
                      <p className="text-sm text-foreground/70 mt-1">
                        {upgrades[0].description}
                      </p>
                    </div>
                    {currentTier && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white animate-pulse">
                        Niveau {upgrades.findIndex(u => u.id === currentTier.id) + 2}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {upgrades.map((upgrade, index) => {
                      const isPurchased = isUpgradePurchased(upgrade.id);
                      const isLocked = playerLevel < upgrade.level_required;
                      const canBuy = canPurchase(upgrade);
                      const buttonState = getButtonState(upgrade);
                      const isCurrentTier = currentTier?.id === upgrade.id;
                      const tierLevel = index + 2; // Niveau 2, 3, 4...
                      
                      return (
                        <div 
                          key={upgrade.id} 
                          className={`flex-shrink-0 w-52 glassmorphism rounded-xl p-4 transition-all duration-300 hover:scale-105 ${
                            isCurrentTier 
                              ? 'ring-2 ring-primary/50 shadow-xl animate-pulse' 
                              : isPurchased 
                                ? 'opacity-75 bg-green-50/50' 
                                : isLocked 
                                  ? 'opacity-50 grayscale' 
                                  : canBuy 
                                    ? 'hover:shadow-xl border-primary/30' 
                                    : 'border-red-300/30'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Header du palier */}
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline" 
                                className={`px-2 py-1 text-xs font-bold ${
                                  isCurrentTier ? 'bg-primary text-primary-foreground' : ''
                                }`}
                              >
                                Niveau {tierLevel}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Req. N.{upgrade.level_required}
                              </Badge>
                            </div>
                            
                            {/* Nom du palier */}
                            <h4 className="font-bold text-sm text-foreground leading-tight">
                              {upgrade.display_name}
                            </h4>

                            {/* Coûts */}
                            <div className="space-y-2">
                              {upgrade.cost_coins > 0 && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Coins className="h-3 w-3 text-yellow-600" />
                                    <span className="text-xs text-foreground/70">Pièces</span>
                                  </div>
                                  <span className={`text-xs font-bold ${
                                    coins >= upgrade.cost_coins + 100 ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                    {upgrade.cost_coins.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {upgrade.cost_gems > 0 && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Gem className="h-3 w-3 text-purple-600" />
                                    <span className="text-xs text-foreground/70">Gemmes</span>
                                  </div>
                                  <span className={`text-xs font-bold ${
                                    gems >= upgrade.cost_gems ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                    {upgrade.cost_gems.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bouton d'achat */}
                            <Button 
                              size="sm" 
                              disabled={!canBuy || isPurchased || isPurchasing} 
                              onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)} 
                              className={`w-full text-xs py-2 ${buttonState.style}`}
                            >
                              <div className="flex items-center gap-2">
                                {buttonState.icon}
                                {buttonState.text}
                              </div>
                            </Button>
                            
                            {/* Message d'aide pour la réserve */}
                            {!isPurchased && coins < upgrade.cost_coins + 100 && coins >= upgrade.cost_coins && (
                              <div className="text-xs text-amber-600 bg-amber-50/50 rounded-lg p-2 animate-pulse">
                                💡 Réserve de sécurité requise
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Message de fin */}
        {sequentialUpgrades.length === 0 && (
          <div className="glassmorphism rounded-2xl p-8 text-center animate-fade-in bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-400/30">
            <div className="text-4xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Félicitations !
            </h3>
            <p className="text-foreground/70">
              Toutes les améliorations disponibles ont été débloquées !
              <br />
              Continuez à progresser pour débloquer de nouvelles améliorations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
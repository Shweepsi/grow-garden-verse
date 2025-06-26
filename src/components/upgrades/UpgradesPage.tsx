
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useGameData } from '@/hooks/useGameData';
import { Coins, CheckCircle, Lock, Star, Zap, Gem, Users, Gift } from 'lucide-react';
import { LevelUpgrade } from '@/types/upgrades';
import { EconomyService } from '@/services/EconomyService';

export const UpgradesPage = () => {
  const { data: gameData } = useGameData();
  const { 
    availableUpgrades, 
    upgradesLoading, 
    purchaseUpgrade, 
    isUpgradePurchased,
    isPurchasing 
  } = useUpgrades();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const playerLevel = gameData?.garden?.level || 1;
  const coins = gameData?.garden?.coins || 0;
  const gems = gameData?.garden?.gems || 0;

  const getUpgradeIcon = (effectType: string) => {
    if (effectType.includes('harvest')) return <Coins className="h-5 w-5 text-yellow-500" />;
    if (effectType.includes('growth')) return <Zap className="h-5 w-5 text-blue-500" />;
    if (effectType.includes('auto')) return <Star className="h-5 w-5 text-purple-500" />;
    if (effectType.includes('prestige')) return <Gift className="h-5 w-5 text-pink-500" />;
    if (effectType.includes('exp')) return <Users className="h-5 w-5 text-green-500" />;
    if (effectType.includes('gem')) return <Gem className="h-5 w-5 text-cyan-500" />;
    return <Star className="h-5 w-5 text-gray-500" />;
  };

  const getUpgradesByCategory = (category: string) => {
    if (category === 'all') return availableUpgrades;
    if (category === 'economy') return availableUpgrades.filter(u => 
      u.effect_type.includes('harvest') || u.effect_type.includes('plant_cost') || u.effect_type.includes('gem')
    );
    if (category === 'efficiency') return availableUpgrades.filter(u => 
      u.effect_type.includes('growth') || u.effect_type.includes('auto') || u.effect_type.includes('exp')
    );
    if (category === 'prestige') return availableUpgrades.filter(u => u.effect_type.includes('prestige'));
    return availableUpgrades;
  };

  const canPurchase = (upgrade: LevelUpgrade) => {
    return playerLevel >= upgrade.level_required && 
           EconomyService.canAffordUpgrade(coins, upgrade.cost_coins) && 
           gems >= upgrade.cost_gems &&
           !isUpgradePurchased(upgrade.id);
  };

  const filteredUpgrades = getUpgradesByCategory(selectedCategory);

  if (upgradesLoading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="text-white text-xl">Chargement des améliorations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen garden-background">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-green-300 rounded-full opacity-60 animate-float"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-yellow-300 rounded-full opacity-40 animate-float-delayed"></div>
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-blue-300 rounded-full opacity-50 animate-float"></div>
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-pink-300 rounded-full opacity-60 animate-float-delayed"></div>
      </div>

      <div className="relative z-10 container mx-auto p-4 space-y-6">
        {/* Header avec glassmorphism */}
        <div className="text-center space-y-4">
          <div className="glassmorphism p-6 rounded-2xl border border-white/20">
            <h1 className="text-4xl font-bold text-white mb-2">
              🌟 Améliorations du Jardin
            </h1>
            <p className="text-white/80 text-lg">
              Débloquez des bonus permanents pour optimiser votre jardin
            </p>
            
            {/* Stats du joueur */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                <span className="text-white/70">Niveau:</span>
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  {playerLevel}
                </Badge>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-100 font-medium">
                  {coins.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
                <Gem className="h-4 w-4 text-purple-400" />
                <span className="text-purple-100 font-medium">
                  {gems.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets avec glassmorphism */}
        <div className="glassmorphism p-1 rounded-2xl border border-white/20">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 border-0"
              >
                Toutes
              </TabsTrigger>
              <TabsTrigger 
                value="economy" 
                className="data-[state=active]:bg-yellow-500/30 data-[state=active]:text-white text-white/70 border-0"
              >
                💰 Économie
              </TabsTrigger>
              <TabsTrigger 
                value="efficiency" 
                className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-white/70 border-0"
              >
                ⚡ Efficacité
              </TabsTrigger>
              <TabsTrigger 
                value="prestige" 
                className="data-[state=active]:bg-pink-500/30 data-[state=active]:text-white text-white/70 border-0"
              >
                🌟 Prestige
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUpgrades.map((upgrade) => {
                  const isPurchased = isUpgradePurchased(upgrade.id);
                  const isLocked = playerLevel < upgrade.level_required;
                  const canBuy = canPurchase(upgrade);

                  return (
                    <Card 
                      key={upgrade.id} 
                      className={`glassmorphism border transition-all duration-300 hover:scale-105 ${
                        isPurchased ? 'border-green-400/50 bg-green-500/10' :
                        isLocked ? 'border-gray-400/30 bg-gray-500/10' :
                        canBuy ? 'border-blue-400/50 bg-blue-500/10 hover:border-blue-400/70' :
                        'border-red-400/30 bg-red-500/10'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{upgrade.emoji}</div>
                            <div>
                              <CardTitle className="text-white text-lg">
                                {upgrade.display_name}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {getUpgradeIcon(upgrade.effect_type)}
                                <Badge 
                                  variant="outline" 
                                  className="bg-white/10 text-white/90 border-white/30 text-xs"
                                >
                                  Niveau {upgrade.level_required}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {isPurchased && (
                            <CheckCircle className="h-6 w-6 text-green-400" />
                          )}
                          {isLocked && (
                            <Lock className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-white/80 text-sm leading-relaxed">
                          {upgrade.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-yellow-400" />
                            <span className={`text-sm font-medium ${
                              EconomyService.canAffordUpgrade(coins, upgrade.cost_coins) ? 
                              'text-green-400' : 'text-red-400'
                            }`}>
                              {upgrade.cost_coins.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            disabled={!canBuy || isPurchased || isPurchasing}
                            onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)}
                            className={`font-medium ${
                              isPurchased ? 'bg-green-600 hover:bg-green-600' :
                              isLocked ? 'bg-gray-500 hover:bg-gray-500' :
                              canBuy ? 'bg-blue-600 hover:bg-blue-700' :
                              'bg-red-500 hover:bg-red-500'
                            }`}
                          >
                            {isPurchased ? 'Acheté' :
                             isLocked ? 'Verrouillé' :
                             isPurchasing ? 'Achat...' :
                             'Acheter'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredUpgrades.length === 0 && (
                <div className="text-center py-8">
                  <div className="glassmorphism p-6 rounded-2xl border border-white/20">
                    <p className="text-white/60 text-lg">
                      Aucune amélioration disponible dans cette catégorie.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

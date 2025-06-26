
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useGameData } from '@/hooks/useGameData';
import { Coins, Gem, Lock, CheckCircle, Star } from 'lucide-react';
import { LevelUpgrade } from '@/types/upgrades';

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

  const getRarityColor = (effectType: string) => {
    if (effectType.includes('harvest')) return 'text-yellow-600 bg-yellow-50';
    if (effectType.includes('growth')) return 'text-blue-600 bg-blue-50';
    if (effectType.includes('unlock')) return 'text-purple-600 bg-purple-50';
    if (effectType.includes('auto')) return 'text-green-600 bg-green-50';
    if (effectType.includes('prestige')) return 'text-pink-600 bg-pink-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getUpgradesByCategory = (category: string) => {
    if (category === 'all') return availableUpgrades;
    if (category === 'harvest') return availableUpgrades.filter(u => u.effect_type.includes('harvest'));
    if (category === 'growth') return availableUpgrades.filter(u => u.effect_type.includes('growth'));
    if (category === 'unlock') return availableUpgrades.filter(u => u.effect_type.includes('unlock'));
    if (category === 'special') return availableUpgrades.filter(u => u.effect_type.includes('auto') || u.effect_type.includes('prestige'));
    return availableUpgrades;
  };

  const canPurchase = (upgrade: LevelUpgrade) => {
    return playerLevel >= upgrade.level_required && 
           coins >= upgrade.cost_coins && 
           gems >= upgrade.cost_gems &&
           !isUpgradePurchased(upgrade.id);
  };

  const filteredUpgrades = getUpgradesByCategory(selectedCategory);

  if (upgradesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Chargement des améliorations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-800">🌟 Améliorations</h1>
        <p className="text-gray-600">Débloquez des bonus permanents pour votre jardin</p>
        
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span>Niveau:</span>
            <Badge variant="outline">{playerLevel}</Badge>
          </div>
          <div className="flex items-center gap-1 text-yellow-600">
            <Coins className="h-4 w-4" />
            {coins.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-purple-600">
            <Gem className="h-4 w-4" />
            {gems.toLocaleString()}
          </div>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="harvest">💰 Récolte</TabsTrigger>
          <TabsTrigger value="growth">⚡ Croissance</TabsTrigger>
          <TabsTrigger value="unlock">🔓 Déblocages</TabsTrigger>
          <TabsTrigger value="special">🌟 Spéciales</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUpgrades.map((upgrade) => {
              const isPurchased = isUpgradePurchased(upgrade.id);
              const isLocked = playerLevel < upgrade.level_required;
              const canBuy = canPurchase(upgrade);

              return (
                <Card 
                  key={upgrade.id} 
                  className={`transition-all ${
                    isPurchased ? 'bg-green-50 border-green-200' :
                    isLocked ? 'bg-gray-50 border-gray-200' :
                    canBuy ? 'hover:shadow-lg border-blue-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{upgrade.emoji}</span>
                        <div>
                          <CardTitle className="text-lg">{upgrade.display_name}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={getRarityColor(upgrade.effect_type)}
                          >
                            Niveau {upgrade.level_required}
                          </Badge>
                        </div>
                      </div>
                      
                      {isPurchased && (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                      {isLocked && (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">{upgrade.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        {upgrade.cost_coins > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Coins className="h-3 w-3 text-yellow-600" />
                            <span className={coins >= upgrade.cost_coins ? 'text-green-600' : 'text-red-500'}>
                              {upgrade.cost_coins.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {upgrade.cost_gems > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Gem className="h-3 w-3 text-purple-600" />
                            <span className={gems >= upgrade.cost_gems ? 'text-green-600' : 'text-red-500'}>
                              {upgrade.cost_gems.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        disabled={!canBuy || isPurchased || isPurchasing}
                        onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost_coins, upgrade.cost_gems)}
                        className={
                          isPurchased ? 'bg-green-600' :
                          isLocked ? 'bg-gray-400' :
                          canBuy ? 'bg-blue-600 hover:bg-blue-700' :
                          'bg-red-400'
                        }
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
            <div className="text-center py-8 text-gray-500">
              Aucune amélioration disponible dans cette catégorie.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { PlantType } from '@/types/game';
import { ShopItem } from '@/hooks/useShop';
import { Coins, Sparkles } from 'lucide-react';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';

interface DirectSeedPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  plotNumber: number;
  availableSeeds: Array<{
    shopItem: ShopItem;
    plantType: PlantType;
  }>;
  coins: number;
}

export const DirectSeedPurchase = ({ 
  isOpen, 
  onClose, 
  plotNumber, 
  availableSeeds,
  coins 
}: DirectSeedPurchaseProps) => {
  const { buyAndPlant, isBuying } = useDirectPlanting();

  const handlePurchase = async (seedItem: ShopItem, plantType: PlantType) => {
    try {
      await buyAndPlant(plotNumber, seedItem.price, plantType.id, seedItem.display_name);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'border-purple-500 bg-purple-50';
      case 'legendary': return 'border-yellow-500 bg-yellow-50';
      case 'epic': return 'border-purple-400 bg-purple-50';
      case 'rare': return 'border-blue-400 bg-blue-50';
      case 'uncommon': return 'border-green-400 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'text-purple-700';
      case 'legendary': return 'text-yellow-700';
      case 'epic': return 'text-purple-600';
      case 'rare': return 'text-blue-600';
      case 'uncommon': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Grouper par rareté pour un affichage organisé
  const seedsByRarity = availableSeeds.reduce((acc, seed) => {
    const rarity = seed.shopItem.rarity || 'common';
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(seed);
    return acc;
  }, {} as Record<string, typeof availableSeeds>);

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Choisir une graine - Parcelle {plotNumber}
            <div className="ml-auto flex items-center gap-1 text-sm text-yellow-600">
              <Coins className="h-4 w-4" />
              {coins.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {rarityOrder.map(rarity => {
            const seeds = seedsByRarity[rarity];
            if (!seeds?.length) return null;

            return (
              <div key={rarity}>
                <h3 className={`text-lg font-semibold mb-3 ${getRarityTextColor(rarity)}`}>
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)} 
                  {rarity === 'mythic' && ' ✨'}
                  {rarity === 'legendary' && ' 🌟'}
                  {rarity === 'epic' && ' 💫'}
                  {rarity === 'rare' && ' ⭐'}
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {seeds.map(({ shopItem, plantType }) => {
                    const canAfford = coins >= shopItem.price;
                    const isExpensive = shopItem.price >= 1000000;

                    return (
                      <Card
                        key={shopItem.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${getRarityColor(shopItem.rarity)}`}
                      >
                        <CardContent className="p-4">
                          <div className="text-center space-y-2">
                            <div className="text-3xl mb-2">{plantType.emoji}</div>
                            
                            <h4 className="font-medium text-sm">{plantType.display_name}</h4>
                            
                            <p className="text-xs text-gray-600 mb-2">
                              {plantType.growth_stages} étapes • {shopItem.rarity}
                            </p>

                            <div className={`font-bold text-sm flex items-center justify-center gap-1 ${
                              canAfford ? 'text-green-600' : 'text-red-500'
                            }`}>
                              <Coins className="h-3 w-3" />
                              {isExpensive 
                                ? `${(shopItem.price / 1000000).toFixed(1)}M` 
                                : shopItem.price.toLocaleString()
                              }
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handlePurchase(shopItem, plantType)}
                              disabled={!canAfford || isBuying}
                              className={`w-full mt-2 ${
                                canAfford 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-gray-400'
                              }`}
                            >
                              {isBuying ? 'Achat...' : 'Acheter & Planter'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {availableSeeds.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">Aucune graine disponible</p>
              <p className="text-sm text-gray-500">
                Les nouvelles graines arrivent bientôt !
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

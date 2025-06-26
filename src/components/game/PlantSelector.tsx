
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { PlantType } from '@/types/game';
import { Coins, Sparkles } from 'lucide-react';
import { GameBalanceService } from '@/services/GameBalanceService';

interface PlantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  plotNumber: number;
  plantTypes: PlantType[];
  coins: number;
  onPlantDirect: (plotNumber: number, plantTypeId: string, cost: number) => void;
}

export const PlantSelector = ({ 
  isOpen, 
  onClose, 
  plotNumber, 
  plantTypes,
  coins,
  onPlantDirect
}: PlantSelectorProps) => {
  const [isPlanting, setIsPlanting] = useState(false);

  const handlePlant = async (plantType: PlantType) => {
    const cost = getPlantCost(plantType.rarity || 'common');
    if (coins < cost) return;

    setIsPlanting(true);
    try {
      await onPlantDirect(plotNumber, plantType.id, cost);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la plantation:', error);
    } finally {
      setIsPlanting(false);
    }
  };

  const getPlantCost = (rarity: string): number => {
    const priceRange = GameBalanceService.getSeedPriceRange(rarity);
    return Math.floor((priceRange.min + priceRange.max) / 2);
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

  // Grouper par rareté
  const plantsByRarity = plantTypes.reduce((acc, plant) => {
    const rarity = plant.rarity || 'common';
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(plant);
    return acc;
  }, {} as Record<string, PlantType[]>);

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Choisir une plante - Parcelle {plotNumber}
            <div className="ml-auto flex items-center gap-1 text-sm text-yellow-600">
              <Coins className="h-4 w-4" />
              {coins.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {rarityOrder.map(rarity => {
            const plants = plantsByRarity[rarity];
            if (!plants?.length) return null;

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
                  {plants.map((plantType) => {
                    const cost = getPlantCost(plantType.rarity || 'common');
                    const canAfford = coins >= cost;

                    return (
                      <Card
                        key={plantType.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${getRarityColor(plantType.rarity)}`}
                      >
                        <CardContent className="p-4">
                          <div className="text-center space-y-2">
                            <div className="text-3xl mb-2">{plantType.emoji}</div>
                            
                            <h4 className="font-medium text-sm">{plantType.display_name}</h4>
                            
                            <p className="text-xs text-gray-600 mb-2">
                              Croissance: {plantType.base_growth_minutes}min
                            </p>

                            <div className={`font-bold text-sm flex items-center justify-center gap-1 ${
                              canAfford ? 'text-green-600' : 'text-red-500'
                            }`}>
                              <Coins className="h-3 w-3" />
                              {cost.toLocaleString()}
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handlePlant(plantType)}
                              disabled={!canAfford || isPlanting}
                              className={`w-full mt-2 ${
                                canAfford 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-gray-400'
                              }`}
                            >
                              {isPlanting ? 'Plantation...' : 'Planter'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

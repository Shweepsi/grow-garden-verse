
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { DirectSeedPurchase } from './DirectSeedPurchase';
import { StageGrowthService } from '@/services/StageGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';
import { useShop } from '@/hooks/useShop';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onWaterPlant: (plotNumber: number) => void;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotGrid = ({ 
  plots, 
  plantTypes, 
  coins,
  onWaterPlant, 
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);
  const { shopItems } = useShop();

  const getPlantState = (plot: GardenPlot) => {
    if (!plot.plant_type) return 'empty';
    
    const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
    if (!plantType) return 'empty';
    
    const isReady = StageGrowthService.isReadyToHarvest(plot.plant_stage, plantType.growth_stages);
    
    return isReady ? 'ready' : 'growing';
  };

  const handlePlotClick = (plot: GardenPlot) => {
    if (!plot.unlocked) return;
    
    const state = getPlantState(plot);
    if (state === 'empty') {
      setSelectedPlot(plot.plot_number);
      setShowSeedSelector(true);
    } else if (state === 'growing') {
      onWaterPlant(plot.plot_number);
    } else if (state === 'ready') {
      onHarvestPlant(plot.plot_number);
    }
  };

  // Obtenir les graines disponibles avec leur type de plante correspondant
  const getAvailableSeeds = () => {
    return shopItems
      .filter(item => item.item_type === 'seed')
      .map(shopItem => {
        const plantTypeName = shopItem.name.replace('_seed', '');
        const plantType = plantTypes.find(pt => pt.name === plantTypeName);
        return {
          shopItem,
          plantType
        };
      })
      .filter(item => item.plantType)
      .sort((a, b) => a.shopItem.price - b.shopItem.price);
  };

  const availableSeeds = getAvailableSeeds();

  return (
    <>
      <div className="grid grid-cols-3 gap-4 p-4">
        {plots.map((plot) => {
          const state = getPlantState(plot);
          const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
          const unlockCost = GameBalanceService.getUnlockCost(plot.plot_number);
          
          return (
            <Card
              key={plot.id}
              className={`aspect-square cursor-pointer transition-all ${
                plot.unlocked 
                  ? 'hover:shadow-lg border-green-200 hover:border-green-400' 
                  : 'bg-gray-100 border-gray-200'
              }`}
              onClick={() => plot.unlocked ? handlePlotClick(plot) : null}
            >
              <CardContent className="p-3 h-full flex flex-col items-center justify-center">
                {!plot.unlocked ? (
                  <div className="text-center">
                    <Lock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 mb-2">Parcelle {plot.plot_number}</p>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlockPlot(plot.plot_number);
                      }}
                      disabled={coins < unlockCost}
                      className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-auto"
                    >
                      {unlockCost >= 1000000 
                        ? `${(unlockCost / 1000000).toFixed(1)}M 🪙`
                        : `${unlockCost.toLocaleString()} 🪙`
                      }
                    </Button>
                  </div>
                ) : (
                  <div className="text-center h-full flex flex-col justify-center">
                    {state === 'empty' ? (
                      <>
                        <Sprout className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-xs text-green-600 font-medium">Acheter & Planter</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {availableSeeds.length} graines disponibles
                        </p>
                      </>
                    ) : state === 'growing' ? (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={plot.plant_stage}
                          waterCount={plot.plant_water_count}
                        />
                      </>
                    ) : (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={plot.plant_stage}
                          waterCount={plot.plant_water_count}
                        />
                        <div className="mt-2 flex items-center justify-center">
                          <Gift className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-600 font-bold">Récolter</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DirectSeedPurchase
        isOpen={showSeedSelector}
        onClose={() => {
          setShowSeedSelector(false);
          setSelectedPlot(null);
        }}
        plotNumber={selectedPlot || 1}
        availableSeeds={availableSeeds}
        coins={coins}
      />
    </>
  );
};

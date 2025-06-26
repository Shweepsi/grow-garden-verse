
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Droplets, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { PlantTimer } from './PlantTimer';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onPlantSeed: (plotNumber: number, plantTypeId: string) => void;
  onWaterPlant: (plotNumber: number) => void;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotGrid = ({ 
  plots, 
  plantTypes, 
  coins,
  onPlantSeed, 
  onWaterPlant, 
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);

  const getPlantState = (plot: GardenPlot) => {
    if (!plot.plant_type || !plot.planted_at) return 'empty';
    
    const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
    if (!plantType) return 'empty';
    
    const isReady = PlantGrowthService.isPlantReady(
      plot.planted_at, 
      plot.growth_time_minutes || plantType.base_growth_minutes || 60
    );
    
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

  const handleSeedSelect = (plantTypeId: string) => {
    if (selectedPlot) {
      onPlantSeed(selectedPlot, plantTypeId);
      setShowSeedSelector(false);
      setSelectedPlot(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 p-4">
        {plots.map((plot) => {
          const state = getPlantState(plot);
          const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
          
          return (
            <Card
              key={plot.id}
              className={`aspect-square cursor-pointer transition-all ${
                plot.unlocked 
                  ? 'hover:shadow-lg border-green-200' 
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
                      disabled={coins < GameBalanceService.getUnlockCost(plot.plot_number)}
                      className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-auto"
                    >
                      {GameBalanceService.getUnlockCost(plot.plot_number)} 🪙
                    </Button>
                  </div>
                ) : (
                  <div className="text-center h-full flex flex-col justify-center">
                    {state === 'empty' ? (
                      <>
                        <Sprout className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <p className="text-xs text-green-600">Planter</p>
                      </>
                    ) : state === 'growing' ? (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={Math.floor(PlantGrowthService.calculateGrowthProgress(
                            plot.planted_at,
                            plot.growth_time_minutes || plantType?.base_growth_minutes || 60
                          ) * (plantType?.growth_stages || 3))}
                          waterCount={plot.plant_water_count}
                        />
                        <PlantTimer
                          plantedAt={plot.planted_at}
                          growthTimeMinutes={plot.growth_time_minutes || plantType?.base_growth_minutes || 60}
                          className="text-blue-600 mt-1"
                        />
                        <div className="mt-1 flex items-center justify-center">
                          <Droplets className="h-3 w-3 text-blue-500 mr-1" />
                          <span className="text-xs text-blue-600">Arroser</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={plantType?.growth_stages || 3}
                          waterCount={plot.plant_water_count}
                        />
                        <div className="mt-2 flex items-center justify-center">
                          <Gift className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-600">Récolter</span>
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

      <Dialog open={showSeedSelector} onOpenChange={setShowSeedSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choisir une graine</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {plantTypes.map((plantType) => (
              <Button
                key={plantType.id}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => handleSeedSelect(plantType.id)}
              >
                <span className="text-2xl mb-1">{plantType.emoji}</span>
                <span className="text-sm">{plantType.display_name}</span>
                <span className="text-xs text-gray-500">
                  {plantType.base_growth_minutes || 60}min
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

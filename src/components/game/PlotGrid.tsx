
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Droplets, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';

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
    if (!plot.plant_type) return 'empty';
    const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
    if (!plantType) return 'empty';
    
    if (plot.plant_stage >= plantType.growth_stages) return 'ready';
    return 'growing';
  };

  const getUnlockCost = (plotNumber: number) => {
    const costs = [0, 100, 250, 500];
    return costs[plotNumber - 1] || 0;
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
      <div className="grid grid-cols-2 gap-4 p-4">
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
              <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                {!plot.unlocked ? (
                  <div className="text-center">
                    <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">Parcelle {plot.plot_number}</p>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlockPlot(plot.plot_number);
                      }}
                      disabled={coins < getUnlockCost(plot.plot_number)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Débloquer {getUnlockCost(plot.plot_number)} 🪙
                    </Button>
                  </div>
                ) : (
                  <div className="text-center h-full flex flex-col justify-center">
                    {state === 'empty' ? (
                      <>
                        <Sprout className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-green-600">Planter une graine</p>
                      </>
                    ) : state === 'growing' ? (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={plot.plant_stage}
                          waterCount={plot.plant_water_count}
                        />
                        <div className="mt-2 flex items-center justify-center">
                          <Droplets className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-xs text-blue-600">Arroser</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <PlantDisplay 
                          plantType={plantType!} 
                          stage={plot.plant_stage}
                          waterCount={plot.plant_water_count}
                        />
                        <div className="mt-2 flex items-center justify-center">
                          <Gift className="h-4 w-4 text-yellow-500 mr-1" />
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
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

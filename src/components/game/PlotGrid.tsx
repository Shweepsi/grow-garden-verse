
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { PlantSelector } from './PlantSelector';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotGrid = ({ 
  plots, 
  plantTypes, 
  coins,
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const { plantDirect, isPlanting } = useDirectPlanting();

  const getPlantState = (plot: GardenPlot) => {
    // Validation stricte des données de la parcelle
    if (!plot.plant_type) return 'empty';
    
    const growthTime = plot.growth_time_seconds || 3600; // Défaut 1h si pas défini
    const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
    
    return isReady ? 'ready' : 'growing';
  };

  const handlePlotClick = (plot: GardenPlot) => {
    if (!plot.unlocked) {
      console.log(`🔒 Tentative de clic sur parcelle ${plot.plot_number} verrouillée`);
      return;
    }
    
    const state = getPlantState(plot);
    console.log(`🖱️ Clic sur parcelle ${plot.plot_number}, état: ${state}`);
    
    if (state === 'empty') {
      setSelectedPlot(plot.plot_number);
      setShowPlantSelector(true);
      console.log(`🌱 Ouverture du sélecteur de plantes pour parcelle ${plot.plot_number}`);
    } else if (state === 'ready') {
      console.log(`🌾 Tentative de récolte sur parcelle ${plot.plot_number}`);
      onHarvestPlant(plot.plot_number);
    } else {
      console.log(`⏰ Plante en croissance sur parcelle ${plot.plot_number}`);
    }
  };

  const handlePlantSelection = (plotNumber: number, plantTypeId: string, cost: number) => {
    console.log(`🌱 Plantation sélectionnée: parcelle ${plotNumber}, plante ${plantTypeId}, coût ${cost}`);
    plantDirect(plotNumber, plantTypeId, cost);
  };

  const handleClosePlantSelector = () => {
    console.log('❌ Fermeture du sélecteur de plantes');
    setShowPlantSelector(false);
    setSelectedPlot(null);
  };

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
              className={`aspect-square cursor-pointer transition-all relative ${
                plot.unlocked 
                  ? 'hover:shadow-lg border-green-200 hover:border-green-400' 
                  : 'bg-gray-100 border-gray-200'
              } ${isPlanting ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => !isPlanting ? handlePlotClick(plot) : null}
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
                        console.log(`🔓 Tentative de déblocage parcelle ${plot.plot_number}, coût: ${unlockCost}`);
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
                  <div className="text-center h-full flex flex-col justify-center w-full relative">
                    {state === 'empty' ? (
                      <>
                        <Sprout className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-xs text-green-600 font-medium">Planter une plante</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {plantTypes.length} variétés disponibles
                        </p>
                      </>
                    ) : state === 'growing' ? (
                      <>
                        {plantType ? (
                          <PlantDisplay 
                            plantType={plantType} 
                            plantedAt={plot.planted_at}
                            growthTimeSeconds={plot.growth_time_seconds || 3600}
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl mb-1">❌</div>
                            <p className="text-xs text-red-500">Plante inconnue</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {plantType ? (
                          <PlantDisplay 
                            plantType={plantType} 
                            plantedAt={plot.planted_at}
                            growthTimeSeconds={plot.growth_time_seconds || 3600}
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl mb-1">❌</div>
                            <p className="text-xs text-red-500">Plante inconnue</p>
                          </div>
                        )}
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

      <PlantSelector
        isOpen={showPlantSelector}
        onClose={handleClosePlantSelector}
        plotNumber={selectedPlot || 1}
        plantTypes={plantTypes}
        coins={coins}
        onPlantDirect={handlePlantSelection}
      />
    </>
  );
};

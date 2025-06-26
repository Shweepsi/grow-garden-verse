import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { PlantSelector } from './PlantSelector';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';
import { useAnimations } from '@/contexts/AnimationContext';

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
  const { plantDirect, isPlanting, plantDirectData } = useDirectPlanting();
  const { showCoinAnimation, showXPAnimation } = useAnimations();

  const getPlantState = (plot: GardenPlot) => {
    // Validation stricte des données de la parcelle
    if (!plot.plant_type) return 'empty';
    
    const growthTime = plot.growth_time_seconds || 3600; // Défaut 1h si pas défini
    const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
    
    return isReady ? 'ready' : 'growing';
  };

  const handlePlotClick = (plot: GardenPlot, event?: React.MouseEvent) => {
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
      
      // Obtenir la position pour l'animation
      const rect = event?.currentTarget.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      
      onHarvestPlant(plot.plot_number);
    } else {
      console.log(`⏰ Plante en croissance sur parcelle ${plot.plot_number}`);
    }
  };

  const handlePlantSelection = (plotNumber: number, plantTypeId: string, cost: number) => {
    console.log(`🌱 Plantation sélectionnée: parcelle ${plotNumber}, plante ${plantTypeId}, coût ${cost}`);
    plantDirect(plotNumber, plantTypeId, cost);
    
    // Animation pour le coût de plantation
    showCoinAnimation(-cost);
  };

  const handleClosePlantSelector = () => {
    console.log('❌ Fermeture du sélecteur de plantes');
    setShowPlantSelector(false);
    setSelectedPlot(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 p-3">
        {plots.map((plot) => {
          const state = getPlantState(plot);
          const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
          const unlockCost = GameBalanceService.getUnlockCost(plot.plot_number);
          
          return (
            <div
              key={plot.id}
              className={`aspect-square cursor-pointer transition-all duration-300 relative group touch-target ${
                isPlanting ? 'pointer-events-none opacity-50' : ''
              }`}
              onClick={(e) => !isPlanting ? handlePlotClick(plot, e) : null}
            >
              <div className={`premium-card rounded-xl p-2 h-full flex flex-col items-center justify-center relative overflow-hidden ${
                plot.unlocked 
                  ? state === 'ready' 
                    ? 'sparkle-border glow-effect' 
                    : 'hover:shadow-2xl'
                  : 'opacity-60'
              }`}>
                
                {/* Effet de brillance pour les plantes prêtes */}
                {plot.unlocked && state === 'ready' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer"></div>
                )}
                
                {!plot.unlocked ? (
                  <div className="text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      <Lock className="h-5 w-5 text-gray-600" />
                    </div>
                    <p className="mobile-text-xs text-gray-500 mb-2 font-medium">Parcelle {plot.plot_number}</p>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`🔓 Tentative de déblocage parcelle ${plot.plot_number}, coût: ${unlockCost}`);
                        onUnlockPlot(plot.plot_number);
                      }}
                      disabled={coins < unlockCost}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white mobile-text-xs px-2 py-1 h-auto rounded-md shadow-lg transform hover:scale-105 transition-all duration-200 touch-target"
                    >
                      {unlockCost >= 1000000 
                        ? `${(unlockCost / 1000000).toFixed(1)}M 🪙`
                        : unlockCost >= 1000
                        ? `${(unlockCost / 1000).toFixed(1)}K 🪙`
                        : `${unlockCost.toLocaleString()} 🪙`
                      }
                    </Button>
                  </div>
                ) : (
                  <div className="text-center h-full flex flex-col justify-center w-full relative z-10">
                    {state === 'empty' ? (
                      <>
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300">
                          <Sprout className="h-5 w-5 text-white" />
                        </div>
                        <p className="mobile-text-sm text-green-700 font-semibold mb-1">Planter</p>
                        <p className="mobile-text-xs text-gray-600">
                          {plantTypes.length} variétés
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
                            <div className="text-lg mb-1">❌</div>
                            <p className="mobile-text-xs text-red-500">Plante inconnue</p>
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
                            <div className="text-lg mb-1">❌</div>
                            <p className="mobile-text-xs text-red-500">Plante inconnue</p>
                          </div>
                        )}
                        <div className="mt-1 flex items-center justify-center">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center space-x-1 pulse-grow">
                            <Gift className="h-2.5 w-2.5" />
                            <span className="mobile-text-xs font-bold">Récolter</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Indicator for active state */}
                {plot.unlocked && state !== 'empty' && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      state === 'ready' 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-ping' 
                        : 'bg-gradient-to-r from-blue-400 to-green-500 animate-pulse'
                    }`}></div>
                  </div>
                )}
              </div>
            </div>
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


import { memo, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';

interface PlotCardProps {
  plot: GardenPlot;
  plantType?: PlantType;
  plantTypesCount: number;
  coins: number;
  isPlanting: boolean;
  hasAutoHarvest?: boolean;
  robotAtCapacity?: boolean;
  onPlotClick: (plot: GardenPlot) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotCard = memo(({
  plot,
  plantType,
  plantTypesCount,
  coins,
  isPlanting,
  hasAutoHarvest = false,
  robotAtCapacity = false,
  onPlotClick,
  onUnlockPlot
}: PlotCardProps) => {
  
  // Memoiser le calcul de l'état de la plante pour éviter les recalculs
  const plantState = useMemo(() => {
    if (!plot.plant_type) return 'empty';
    const growthTime = plot.growth_time_seconds || 3600;
    const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
    return isReady ? 'ready' : 'growing';
  }, [plot.plant_type, plot.planted_at, plot.growth_time_seconds]);

  // Memoiser le calcul du coût de déblocage
  const unlockCost = useMemo(() => {
    const costs = [0, 300, 800, 2200, 6000, 18000, 50000, 140000, 400000];
    return costs[plot.plot_number - 1] || 1200000;
  }, [plot.plot_number]);

  // Memoiser la vérification de la capacité d'achat
  const canAffordUnlock = useMemo(() => 
    EconomyService.canAffordUpgrade(coins, unlockCost),
    [coins, unlockCost]
  );

  const isAutoHarvestPlot = plot.plot_number === 1 && hasAutoHarvest;

  // Optimiser les handlers avec useCallback
  const handleClick = useCallback(() => {
    if (!isPlanting) {
      onPlotClick(plot);
    }
  }, [isPlanting, onPlotClick, plot]);

  const handleUnlockClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUnlockPlot(plot.plot_number);
  }, [onUnlockPlot, plot.plot_number]);

  // Classes dynamiques pour l'animation et l'état
  const containerClasses = useMemo(() => {
    const baseClasses = "aspect-square cursor-pointer transition-all duration-200 relative group touch-target transform-gpu";
    
    if (isPlanting) {
      // Suppression de l'opacité
      return `${baseClasses} pointer-events-none`;
    }
    
    if (plot.unlocked && (plantState === 'ready' || isAutoHarvestPlot)) {
      return `${baseClasses} hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg`;
    }
    
    return `${baseClasses} active:scale-[0.98]`;
  }, [isPlanting, plot.unlocked, plantState, isAutoHarvestPlot]);

  const cardClasses = useMemo(() => {
    // Suppression des couleurs semi-transparentes et opacités
    const baseClasses = "bg-white backdrop-blur-sm rounded-lg p-3 h-full flex flex-col items-center justify-center relative border transition-all duration-200 transform-gpu";
    
    if (!plot.unlocked) {
      return `${baseClasses} border-gray-200 bg-gray-100`;
    }
    
    if (isAutoHarvestPlot) {
      return `${baseClasses} ${robotAtCapacity ? 
        'border-yellow-300 bg-yellow-100 shadow-yellow-100' : 
        'border-blue-300 bg-blue-100 shadow-blue-100'} shadow-lg`;
    }
    
    if (plantState === 'ready') {
      return `${baseClasses} border-yellow-300 bg-yellow-100 shadow-yellow-100 shadow-lg`;
    }
    
    return `${baseClasses} border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-md`;
  }, [plot.unlocked, isAutoHarvestPlot, robotAtCapacity, plantState]);

  return (
    <div className={containerClasses} onClick={handleClick} data-plot={plot.plot_number}>
      <div className={cardClasses}>
        
        {!plot.unlocked ? (
          <div className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center mb-2 mx-auto transition-transform duration-200 group-hover:scale-110">
              <Lock className="h-5 w-5 text-gray-600" />
            </div>
            
            <Button 
              size="sm" 
              onClick={handleUnlockClick} 
              disabled={!canAffordUnlock} 
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white mobile-text-xs px-2 py-1 h-auto rounded-md shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 touch-target disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unlockCost >= 1000000 ? `${(unlockCost / 1000000).toFixed(1)}M 🪙` : 
               unlockCost >= 1000 ? `${(unlockCost / 1000).toFixed(1)}K 🪙` : 
               `${unlockCost.toLocaleString()} 🪙`}
            </Button>
          </div>
        ) : (
          <div className="text-center h-full flex flex-col justify-center w-full relative z-10">
            {isAutoHarvestPlot ? (
              // Affichage spécial pour la parcelle d'auto-récolte
              <>
                <div className={`w-10 h-10 bg-gradient-to-br ${robotAtCapacity ? 'from-yellow-400 to-orange-500' : 'from-blue-400 to-blue-500'} rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-lg">🤖</span>
                </div>
                <p className={`mobile-text-sm ${robotAtCapacity ? 'text-yellow-700' : 'text-blue-700'} font-semibold mb-1`}>Robot Auto</p>
                {plantType ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs">{plantType.emoji}</span>
                    <p className={`mobile-text-xs ${robotAtCapacity ? 'text-yellow-600' : 'text-blue-600'} truncate`}>
                      {plantType.display_name}
                    </p>
                  </div>
                ) : (
                  <p className={`mobile-text-xs ${robotAtCapacity ? 'text-yellow-600' : 'text-blue-600'}`}>
                    Configurer
                  </p>
                )}
              </>
            ) : plantState === 'empty' ? (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Sprout className="h-5 w-5 text-white" />
                </div>
                <p className="mobile-text-sm text-green-700 font-semibold mb-1">Planter</p>
                <p className="mobile-text-xs text-gray-600">
                  {plantTypesCount} variétés
                </p>
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
              </>
            )}
          </div>
        )}

        {/* Indicateur spécial pour l'auto-récolte */}
        {isAutoHarvestPlot && (
          <div className="absolute top-1.5 right-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${robotAtCapacity ? 'bg-yellow-400' : 'bg-blue-400'} animate-pulse`}></div>
          </div>
        )}

      </div>
    </div>
  );
});

PlotCard.displayName = 'PlotCard';

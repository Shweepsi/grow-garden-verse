import { useState, useEffect } from 'react';
import { PlotCard } from './PlotCard';
import { PlantSelector } from './PlantSelector';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';
import { useGameData } from '@/hooks/useGameData';
import { PassiveIncomeRobot } from './PassiveIncomeRobot';
import { PlantType } from '@/types/game';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';
import { toast } from 'sonner';

interface PlotGridProps {
  plots: any[];
  plantTypes: PlantType[];
  coins: number;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
  onPlantSuccess: () => void;
}

export const PlotGrid = ({ 
  plots,
  plantTypes, 
  coins, 
  onHarvestPlant,
  onUnlockPlot,
  onPlantSuccess
}: PlotGridProps) => {
  const { data: gameData } = useGameData();
  const { plantDirect } = useDirectPlanting();
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [showRobotModal, setShowRobotModal] = useState(false);
  
  const {
    hasPassiveRobot, 
    robotState, 
    coinsPerMinute, 
    currentAccumulation, 
    collectAccumulatedCoins, 
    claimOfflineRewards, 
    calculateOfflineRewards, 
    isCollecting,
    isClaimingRewards
  } = usePassiveIncomeRobot();

  // Gestion des récompenses hors ligne
  useEffect(() => {
    if (hasPassiveRobot && robotState?.plantType) {
      const handleOfflineRewards = async () => {
        try {
          const offlineRewards = await calculateOfflineRewards();
          if (offlineRewards.offlineCoins > 0) {
            toast.success(`Récompenses hors ligne: ${offlineRewards.offlineCoins.toLocaleString()} 🪙`);
            claimOfflineRewards();
          }
        } catch (error) {
          console.error('Erreur lors du calcul des récompenses hors ligne:', error);
        }
      };
      
      handleOfflineRewards();
    }
  }, [hasPassiveRobot, robotState?.plantType, calculateOfflineRewards, claimOfflineRewards]);

  const handlePlotClick = (plotNumber: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    
    // Parcelle 1 avec robot passif actif
    if (plotNumber === 1 && hasPassiveRobot) {
      setShowRobotModal(true);
      return;
    }
    
    // Parcelles normales
    setSelectedPlot(plotNumber);
    setShowPlantSelector(true);
  };

  const handlePlantSelection = (plotNumber: number, plantTypeId: string, cost: number) => {
    plantDirect(plotNumber, plantTypeId, cost);
  };

  const handleClosePlantSelector = () => {
    setShowPlantSelector(false);
    setSelectedPlot(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 p-4">
        {plots.map((plot, index) => {
          const isAutoHarvestPlot = plot.plot_number === 1 && hasPassiveRobot;
          const currentPlantType = isAutoHarvestPlot 
            ? robotState?.plantType 
            : plantTypes.find(p => p.id === plot.plant_type);
          
          // Vérifier si le robot a atteint la limite de capacité (24h)
          const robotAtCapacity = isAutoHarvestPlot && coinsPerMinute > 0 && 
            currentAccumulation >= (coinsPerMinute * 60 * 24);

          return (
            <PlotCard
              key={plot.id}
              plot={plot}
              plantType={currentPlantType}
              plantTypesCount={plantTypes.length}
              coins={coins}
              isPlanting={false}
              hasAutoHarvest={isAutoHarvestPlot}
              robotAtCapacity={robotAtCapacity}
              onPlotClick={() => handlePlotClick(plot.plot_number, plot.unlocked)}
              onUnlockPlot={onUnlockPlot}
            />
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

      {/* Interface simplifiée pour le robot auto-récolte */}
      <PassiveIncomeRobot
        isOpen={showRobotModal}
        onClose={() => setShowRobotModal(false)}
        coinsPerMinute={coinsPerMinute}
        currentAccumulation={currentAccumulation}
        collectAccumulatedCoins={collectAccumulatedCoins}
        isCollecting={isCollecting}
        currentPlantType={robotState?.plantType}
      />
    </>
  );
};
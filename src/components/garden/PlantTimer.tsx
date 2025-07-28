
import { useEffect, useState, useMemo } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { Clock } from 'lucide-react';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeSeconds: number;
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeSeconds, className = "" }: PlantTimerProps) => {
  const { getCombinedBoostMultiplier } = useGameMultipliers();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Calculer l'intervalle optimal avec useMemo pour éviter les recalculs
  const updateInterval = useMemo(() => {
    if (!plantedAt) return 1000;
    return PlantGrowthService.getOptimalUpdateInterval();
  }, [plantedAt, growthTimeSeconds]);

  useEffect(() => {
    if (!plantedAt) return;

    const updateTimer = () => {
      const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
      
      const remaining = PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds, boosts);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds, boosts);
      
      setTimeRemaining(remaining);
      setIsReady(ready);
    };

    updateTimer();
    
    // Utiliser l'intervalle de mise à jour optimisé
    const interval = setInterval(updateTimer, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds, updateInterval, getCombinedBoostMultiplier]);

  if (!plantedAt || isReady) return null;

  // Classes pour indiquer l'urgence du timer
  const urgencyClass = timeRemaining < 30 ? 'text-orange-600 font-semibold' : 
                     timeRemaining < 120 ? 'text-yellow-600' : 
                     'text-gray-600';

  return (
    <div className={`flex items-center gap-1 text-xs transition-colors duration-300 ${urgencyClass} ${className}`}>
      <Clock className="h-3 w-3" />
      <span className="font-medium">{timeRemaining > 0 
        ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
        : 'Prêt !'}</span>
    </div>
  );
};

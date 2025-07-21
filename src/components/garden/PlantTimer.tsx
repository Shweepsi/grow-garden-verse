
import { useEffect, useState, useMemo } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { Clock } from 'lucide-react';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeSeconds: number;
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeSeconds, className = "" }: PlantTimerProps) => {
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
      const remaining = PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds);
      
      setTimeRemaining(remaining);
      setIsReady(ready);
    };

    updateTimer();
    
    // Utiliser l'intervalle de mise à jour optimisé
    const interval = setInterval(updateTimer, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds, updateInterval]);

  if (!plantedAt || isReady) return null;

  // Classes pour indiquer l'urgence du timer
  const urgencyClass = timeRemaining < 30 ? 'text-orange-600 animate-pulse' : 
                     timeRemaining < 120 ? 'text-yellow-600' : 
                     'text-gray-600';

  return (
    <div className={`flex items-center gap-1 text-xs transition-colors duration-300 ${urgencyClass} ${className}`}>
      <Clock className="h-3 w-3" />
      <span className="font-medium">{PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds) > 0 
        ? `${Math.floor(PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds) / 60)}m ${PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds) % 60}s`
        : 'Prêt !'}</span>
    </div>
  );
};

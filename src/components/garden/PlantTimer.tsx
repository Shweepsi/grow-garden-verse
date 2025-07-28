
import { useEffect, useState, useMemo } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { Clock } from 'lucide-react';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { PlotTraits } from '@/services/PlotIndividualizationService';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeSeconds: number;
  plotTraits?: PlotTraits;
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeSeconds, plotTraits, className = "" }: PlantTimerProps) => {
  const { getBoostMultiplier } = useActiveBoosts();
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
      const boosts = { getBoostMultiplier };
      
      // Appliquer le multiplicateur de croissance des traits si disponible
      let adjustedGrowthTime = growthTimeSeconds;
      if (plotTraits && plotTraits.growthMultiplier) {
        adjustedGrowthTime = Math.max(1, Math.floor(growthTimeSeconds / plotTraits.growthMultiplier));
      }
      
      const remaining = PlantGrowthService.getTimeRemaining(plantedAt, adjustedGrowthTime, boosts);
      const ready = PlantGrowthService.isPlantReady(plantedAt, adjustedGrowthTime, boosts);
      
      setTimeRemaining(remaining);
      setIsReady(ready);
    };

    updateTimer();
    
    // Utiliser l'intervalle de mise à jour optimisé
    const interval = setInterval(updateTimer, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds, updateInterval, getBoostMultiplier, plotTraits]);

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

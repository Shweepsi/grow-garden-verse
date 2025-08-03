
import { useMemo } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { Clock } from 'lucide-react';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useGardenClock } from '@/contexts/GardenClockContext';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeSeconds: number;
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeSeconds, className = "" }: PlantTimerProps) => {
  const { getCombinedBoostMultiplier } = useGameMultipliers();
  const now = useGardenClock();

  const { timeRemaining, isReady } = useMemo(() => {
    if (!plantedAt) return { timeRemaining: 0, isReady: false };
    const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
    return {
      timeRemaining: PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds, boosts),
      isReady: PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds, boosts)
    };
  }, [now, plantedAt, growthTimeSeconds, getCombinedBoostMultiplier]);

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

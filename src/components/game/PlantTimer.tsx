
import { useEffect, useState } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { Clock } from 'lucide-react';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeMinutes: number;
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeMinutes, className = "" }: PlantTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!plantedAt) return;

    const updateTimer = () => {
      const remaining = PlantGrowthService.getTimeRemaining(plantedAt, growthTimeMinutes);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeMinutes);
      
      setTimeRemaining(remaining);
      setIsReady(ready);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeMinutes]);

  if (!plantedAt || isReady) return null;

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Clock className="h-3 w-3" />
      <span>{PlantGrowthService.formatTimeRemaining(timeRemaining)}</span>
    </div>
  );
};

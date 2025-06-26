
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!plantedAt) return;

    const updateTimer = () => {
      const remaining = PlantGrowthService.getTimeRemaining(plantedAt, growthTimeSeconds);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds);
      
      setTimeRemaining(remaining);
      setIsReady(ready);
    };

    updateTimer();
    
    // Utiliser la fréquence de mise à jour optimale selon le temps de croissance
    const updateInterval = PlantGrowthService.getOptimalUpdateInterval(growthTimeSeconds);
    const interval = setInterval(updateTimer, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds]);

  if (!plantedAt || isReady) return null;

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Clock className="h-3 w-3" />
      <span>{PlantGrowthService.formatTimeRemaining(timeRemaining)}</span>
    </div>
  );
};


import { useMemo } from 'react';
import { useUnifiedCalculations } from '@/hooks/useUnifiedCalculations';
import { Clock } from 'lucide-react';
import { useGardenClock } from '@/contexts/GardenClockContext';

interface PlantTimerProps {
  plantedAt: string | null;
  growthTimeSeconds: number;
  plotNumber: number; // Added to get the actual plot data
  className?: string;
}

export const PlantTimer = ({ plantedAt, growthTimeSeconds, plotNumber, className = "" }: PlantTimerProps) => {
  const calculations = useUnifiedCalculations();
  const now = useGardenClock();

  const { timeRemaining, isReady } = useMemo(() => {
    if (!plantedAt) return { timeRemaining: 0, isReady: false };
    
    // UNIFIED CALCULATION: Use the same logic as backend  
    const mockPlot = { 
      growth_time_seconds: growthTimeSeconds, 
      planted_at: plantedAt, 
      plant_type: 'mock',
      id: 'mock',
      user_id: 'mock',
      plot_number: plotNumber,
      unlocked: true,
      plant_metadata: null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    } as any;
    
    return {
      timeRemaining: calculations.getTimeRemaining(plantedAt, mockPlot),
      isReady: calculations.isPlantReady(plantedAt, mockPlot)
    };
  }, [now, plantedAt, growthTimeSeconds, plotNumber, calculations]);

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

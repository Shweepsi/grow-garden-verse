import React from 'react';
import { PlantType } from '@/types/game';
import { GrowthService } from '@/services/growth/GrowthService';
import { useGrowthModifiers } from '@/hooks/useGrowthModifiers';
import { Clock, Zap } from 'lucide-react';

interface GrowthTimeDisplayProps {
  plantType: PlantType;
  className?: string;
}

/**
 * Component to display growth time with all modifiers applied
 */
export const GrowthTimeDisplay: React.FC<GrowthTimeDisplayProps> = ({ 
  plantType, 
  className = '' 
}) => {
  const { modifiers, formatReduction } = useGrowthModifiers();
  
  const baseTime = GrowthService.getBaseGrowthTime(plantType);
  const calculation = GrowthService.calculateGrowthTime(baseTime, modifiers);
  const formattedTime = GrowthService.formatTimeRemaining(calculation.finalTimeSeconds);
  const reduction = formatReduction(baseTime);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">
        {formattedTime}
        {reduction && (
          <span className="text-green-500 ml-1">
            <Zap className="inline w-3 h-3" />
            {reduction}
          </span>
        )}
      </span>
    </div>
  );
};
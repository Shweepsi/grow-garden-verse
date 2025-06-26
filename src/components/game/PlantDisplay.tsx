
import { PlantType } from '@/types/game';

interface PlantDisplayProps {
  plantType: PlantType;
  stage: number;
  waterCount: number;
}

export const PlantDisplay = ({ plantType, stage, waterCount }: PlantDisplayProps) => {
  const getStageEmoji = () => {
    const progress = stage / plantType.growth_stages;
    
    if (progress === 0) return '🌱';
    if (progress < 0.5) return '🌿';
    if (progress < 1) return '🌳';
    return plantType.emoji;
  };

  const getWaterProgress = () => {
    return (waterCount / plantType.water_per_stage) * 100;
  };

  return (
    <div className="text-center">
      <div className="text-3xl mb-1">{getStageEmoji()}</div>
      <p className="text-xs text-gray-600 mb-1">{plantType.display_name}</p>
      <p className="text-xs text-gray-500">
        Étape {stage}/{plantType.growth_stages}
      </p>
      
      {stage < plantType.growth_stages && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all"
              style={{ width: `${getWaterProgress()}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {waterCount}/{plantType.water_per_stage} 💧
          </p>
        </div>
      )}
    </div>
  );
};

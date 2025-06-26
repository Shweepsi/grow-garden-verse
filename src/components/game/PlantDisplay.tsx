
import { useEffect, useState } from 'react';
import { PlantType } from '@/types/game';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { PlantTimer } from './PlantTimer';

interface PlantDisplayProps {
  plantType: PlantType;
  plantedAt: string | null;
  growthTimeSeconds: number;
}

export const PlantDisplay = ({ plantType, plantedAt, growthTimeSeconds }: PlantDisplayProps) => {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Validation des props
  if (!plantType) {
    return (
      <div className="text-center">
        <div className="text-2xl mb-1">❌</div>
        <p className="text-xs text-red-500">Erreur: plante invalide</p>
      </div>
    );
  }

  useEffect(() => {
    if (!plantedAt) return;

    const updateProgress = () => {
      const currentProgress = PlantGrowthService.calculateGrowthProgress(plantedAt, growthTimeSeconds);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds);
      
      setProgress(currentProgress * 100);
      setIsReady(ready);
    };

    updateProgress();
    
    // Utiliser la même fréquence de mise à jour optimale que PlantTimer
    const updateInterval = PlantGrowthService.getOptimalUpdateInterval(growthTimeSeconds);
    const interval = setInterval(updateProgress, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds]);

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'mythic': return 'text-purple-600 font-bold';
      case 'legendary': return 'text-yellow-600 font-bold';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      case 'uncommon': return 'text-green-500';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="text-center">
      <div className={`text-3xl mb-1 ${isReady ? 'animate-bounce' : ''}`}>
        {isReady ? `✨${plantType.emoji || '🌱'}✨` : (plantType.emoji || '🌱')}
      </div>
      
      <p className={`text-xs mb-1 ${getRarityColor(plantType.rarity)}`}>
        {plantType.display_name || plantType.name || 'Plante inconnue'}
      </p>

      {/* Barre de progression mise à jour en temps réel */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div 
          className={`h-2 rounded-full transition-all ${
            isReady 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
              : 'bg-gradient-to-r from-green-400 to-blue-500'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      {isReady ? (
        <p className="text-xs text-yellow-600 font-bold animate-pulse">
          🎉 Prête à récolter !
        </p>
      ) : (
        <PlantTimer 
          plantedAt={plantedAt}
          growthTimeSeconds={growthTimeSeconds}
          className="text-blue-600"
        />
      )}

      {plantType.rarity && plantType.rarity !== 'common' && (
        <div className="mt-1">
          <span className={`text-xs px-2 py-1 rounded-full ${
            plantType.rarity === 'mythic' ? 'bg-purple-100 text-purple-800' :
            plantType.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
            plantType.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
            plantType.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {plantType.rarity.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};


import { useEffect, useState, memo } from 'react';
import { PlantType } from '@/types/game';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { PlantTimer } from './PlantTimer';

interface PlantDisplayProps {
  plantType: PlantType;
  plantedAt: string | null;
  growthTimeSeconds: number;
}

export const PlantDisplay = memo(({ plantType, plantedAt, growthTimeSeconds }: PlantDisplayProps) => {
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
    
    // Optimisation : intervalles plus intelligents selon le temps de croissance
    let updateInterval = 30000; // 30s par défaut
    if (growthTimeSeconds < 300) updateInterval = 5000;   // 5s pour < 5min
    else if (growthTimeSeconds < 1800) updateInterval = 15000; // 15s pour < 30min
    
    const interval = setInterval(updateProgress, updateInterval);

    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds]);

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'mythic': return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'legendary': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'uncommon': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  return (
    <div className="text-center relative">
      <div className={`text-xl mb-1 transition-transform duration-300 ${
        isReady ? 'animate-bounce transform scale-110' : 'hover:scale-105'
      }`}>
        {isReady ? `✨${plantType.emoji || '🌱'}✨` : (plantType.emoji || '🌱')}
      </div>
      
      <p className="mobile-text-xs mb-1 font-semibold text-gray-700">
        {plantType.display_name || plantType.name || 'Plante inconnue'}
      </p>

      {/* Barre de progression optimisée */}
      <div className="w-full bg-gray-200/50 rounded-full h-2 mb-1 overflow-hidden backdrop-blur-sm border border-white/30">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            isReady 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
              : 'bg-gradient-to-r from-green-400 to-blue-500'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      {isReady ? (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full mobile-text-xs font-bold animate-pulse shadow-lg">
          🎉 Prête !
        </div>
      ) : (
        <PlantTimer 
          plantedAt={plantedAt}
          growthTimeSeconds={growthTimeSeconds}
          className="text-blue-600 font-medium mobile-text-xs"
        />
      )}

      {/* Badge de rareté simplifié */}
      {plantType.rarity && plantType.rarity !== 'common' && (
        <div className="mt-1">
          <span className={`mobile-text-xs px-2 py-0.5 rounded-full font-bold shadow-lg ${getRarityColor(plantType.rarity)}`}>
            {plantType.rarity.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
});

PlantDisplay.displayName = 'PlantDisplay';

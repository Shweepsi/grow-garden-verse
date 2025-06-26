
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
      case 'mythic': return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'legendary': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'uncommon': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getRarityGlow = (rarity?: string) => {
    switch (rarity) {
      case 'mythic': return 'drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]';
      case 'legendary': return 'drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]';
      case 'epic': return 'drop-shadow-lg filter drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]';
      case 'rare': return 'drop-shadow-lg filter drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]';
      case 'uncommon': return 'drop-shadow-lg filter drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]';
      default: return '';
    }
  };

  return (
    <div className="text-center relative">
      <div className={`text-3xl mb-2 transition-all duration-300 ${
        isReady 
          ? 'animate-bounce transform scale-110 ' + getRarityGlow(plantType.rarity)
          : 'hover:scale-105 ' + getRarityGlow(plantType.rarity)
      }`}>
        {isReady ? `✨${plantType.emoji || '🌱'}✨` : (plantType.emoji || '🌱')}
      </div>
      
      <p className="text-xs mb-2 font-semibold text-gray-700">
        {plantType.display_name || plantType.name || 'Plante inconnue'}
      </p>

      {/* Barre de progression premium */}
      <div className="w-full bg-gray-200/50 rounded-full h-3 mb-2 overflow-hidden backdrop-blur-sm border border-white/30">
        <div 
          className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
            isReady 
              ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400' 
              : 'bg-gradient-to-r from-green-400 via-blue-500 to-green-400'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        >
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer"></div>
          
          {/* Points de lumière */}
          {isReady && (
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/50 to-orange-300/50 animate-pulse"></div>
          )}
        </div>
      </div>

      {isReady ? (
        <div className="relative">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">
            🎉 Prête à récolter !
          </div>
          {/* Effet de particules */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
        </div>
      ) : (
        <PlantTimer 
          plantedAt={plantedAt}
          growthTimeSeconds={growthTimeSeconds}
          className="text-blue-600 font-medium"
        />
      )}

      {/* Badge de rareté amélioré */}
      {plantType.rarity && plantType.rarity !== 'common' && (
        <div className="mt-2">
          <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-lg ${getRarityColor(plantType.rarity)}`}>
            {plantType.rarity.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};

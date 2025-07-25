import { useEffect, useState, memo } from 'react';
import { PlantType } from '@/types/game';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { PlantTimer } from './PlantTimer';
import { Progress } from '@/components/ui/progress';
interface PlantDisplayProps {
  plantType: PlantType;
  plantedAt: string | null;
  growthTimeSeconds: number;
}
export const PlantDisplay = memo(({
  plantType,
  plantedAt,
  growthTimeSeconds
}: PlantDisplayProps) => {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Validation des props
  if (!plantType) {
    return <div className="text-center">
        <div className="text-2xl mb-1">❌</div>
        <p className="text-xs text-red-500">Erreur: plante invalide</p>
      </div>;
  }
  useEffect(() => {
    if (!plantedAt) return;
    const updateProgress = () => {
      const currentProgress = PlantGrowthService.calculateGrowthProgress(plantedAt, growthTimeSeconds);
      const ready = PlantGrowthService.isPlantReady(plantedAt, growthTimeSeconds);
      setProgress(currentProgress);
      setIsReady(ready);
    };
    updateProgress();

    // Utiliser l'intervalle optimisé pour des mises à jour fluides
    const updateInterval = PlantGrowthService.getOptimalUpdateInterval(growthTimeSeconds);
    const interval = setInterval(updateProgress, updateInterval);
    return () => clearInterval(interval);
  }, [plantedAt, growthTimeSeconds]);
  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'mythic':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'legendary':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'epic':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
      case 'rare':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'uncommon':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };
  return <div className="text-center relative">
      {/* Animation basée sur le progrès - bounce quand prêt */}
      <div className={`text-xl mb-2 transition-all duration-300 ${isReady ? 'animate-bounce' : progress > 75 ? 'transform scale-105' : 'hover:scale-105'}`}>
        {isReady ? `${plantType.emoji || '🌱'}` : plantType.emoji || '🌱'}
      </div>
      
      <p className={`mobile-text-xs mb-2 font-medium transition-colors duration-300 ${isReady ? 'text-yellow-600' : progress > 50 ? 'text-green-600' : 'text-gray-600'}`}>
        {plantType.display_name || plantType.name || 'Plante inconnue'}
      </p>

      {/* Barre de progression avec couleurs bleu → vert → orange (90%) */}
      <div className="mb-2 w-full">
        <div className="relative h-2 bg-white/30 backdrop-blur-sm rounded-full border border-white/40 overflow-hidden">
          <div className={`h-full transition-all duration-500 ease-out ${
            isReady ? 'bg-gradient-to-r from-yellow-400 to-orange-400 shadow-lg shadow-yellow-200/50' 
            : progress >= 90 ? 'bg-gradient-to-r from-orange-400 to-amber-400 shadow-lg shadow-orange-200/50' 
            : progress > 33 ? 'bg-gradient-to-r from-green-400 to-emerald-400 shadow-lg shadow-green-200/50' 
            : 'bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-200/50'
          }`} style={{
          width: `${progress}%`
        }} />
          {/* Effet de brillance statique */}
          {progress > 0 && <div className="absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12" style={{
          left: `${Math.max(0, progress - 15)}%`,
          opacity: progress > 10 ? 0.5 : 0
        }} />}
        </div>
        
      </div>

      {isReady ? <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full mobile-text-xs font-medium shadow-lg">
          Récolter
        </div> : <div className={`transition-colors duration-300 ${progress > 75 ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          <PlantTimer plantedAt={plantedAt} growthTimeSeconds={growthTimeSeconds} className="mobile-text-xs" />
        </div>}

      {/* Badge de rareté */}
      {plantType.rarity && plantType.rarity !== 'common' && <div className="mt-1">
          <span className={`mobile-text-xs px-2 py-0.5 rounded-full font-medium ${getRarityColor(plantType.rarity)}`}>
            {plantType.rarity.toUpperCase()}
          </span>
        </div>}
    </div>;
});
PlantDisplay.displayName = 'PlantDisplay';
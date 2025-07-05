
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
      {/* Animation de croissance basée sur le progrès */}
      <div className={`text-xl mb-1 transition-all duration-500 ${
        isReady 
          ? 'animate-bounce transform scale-125 filter drop-shadow-lg' 
          : progress > 75 
            ? 'transform scale-110 animate-pulse' 
            : progress > 50 
              ? 'transform scale-105' 
              : progress > 25 
                ? 'transform scale-102' 
                : 'hover:scale-105'
      }`}>
        {isReady ? `✨${plantType.emoji || '🌱'}✨` : (plantType.emoji || '🌱')}
      </div>
      
      <p className={`mobile-text-xs mb-1 font-semibold transition-colors duration-300 ${
        isReady 
          ? 'text-yellow-600 animate-pulse' 
          : progress > 50 
            ? 'text-green-700' 
            : 'text-gray-700'
      }`}>
        {plantType.display_name || plantType.name || 'Plante inconnue'}
      </p>

      {/* Barre de progression améliorée avec animation fluide */}
      <div className="w-full bg-gray-200/50 rounded-full h-2 mb-1 overflow-hidden backdrop-blur-sm border border-white/30 relative">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
            isReady 
              ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-pulse' 
              : progress > 75
                ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-400'
                : progress > 50
                  ? 'bg-gradient-to-r from-green-400 to-blue-500'
                  : progress > 25
                    ? 'bg-gradient-to-r from-blue-400 to-green-400'
                    : 'bg-gradient-to-r from-gray-400 to-blue-400'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        >
          {/* Effet de brillance qui se déplace */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
        
        {/* Particules de croissance */}
        {progress > 25 && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className={`absolute top-1/2 w-0.5 h-0.5 bg-green-400 rounded-full animate-bounce opacity-60`} 
                 style={{ 
                   left: `${Math.min(95, progress - 10)}%`, 
                   animationDelay: '0.5s',
                   animationDuration: '2s'
                 }}></div>
            {progress > 50 && (
              <div className={`absolute top-1/2 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-bounce opacity-60`} 
                   style={{ 
                     left: `${Math.min(95, progress - 5)}%`, 
                     animationDelay: '1s',
                     animationDuration: '2.5s'
                   }}></div>
            )}
          </div>
        )}
      </div>

      {isReady ? (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-white px-2 py-0.5 rounded-full mobile-text-xs font-bold animate-pulse shadow-lg transform hover:scale-105 cursor-pointer">
          🎉 Prête !
        </div>
      ) : (
        <div className={`transition-all duration-300 ${
          progress > 75 
            ? 'text-green-600 font-bold animate-pulse' 
            : progress > 50 
              ? 'text-green-600 font-semibold' 
              : 'text-blue-600 font-medium'
        }`}>
          <PlantTimer 
            plantedAt={plantedAt}
            growthTimeSeconds={growthTimeSeconds}
            className="mobile-text-xs"
          />
        </div>
      )}

      {/* Badge de rareté avec animation */}
      {plantType.rarity && plantType.rarity !== 'common' && (
        <div className="mt-1 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <span className={`mobile-text-xs px-2 py-0.5 rounded-full font-bold shadow-lg transition-all duration-300 hover:scale-105 ${getRarityColor(plantType.rarity)}`}>
            {plantType.rarity.toUpperCase()}
          </span>
        </div>
      )}

      {/* Effet de particules autour des plantes presque prêtes */}
      {progress > 85 && !isReady && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 w-1 h-1 bg-yellow-400/60 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-4 left-2 w-0.5 h-0.5 bg-green-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-4 right-3 w-1 h-1 bg-orange-400/60 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
        </div>
      )}
    </div>
  );
});

PlantDisplay.displayName = 'PlantDisplay';


import React, { useMemo } from 'react';
import { Coins, Gem, Star, Trophy } from 'lucide-react';
import { PlayerGarden } from '@/types/game';

interface PlayerStatsProps {
  garden: PlayerGarden | null;
}

// Mémorisation pour éviter les re-renders inutiles
export const PlayerStats = React.memo(({ garden }: PlayerStatsProps) => {
  // Mémoriser le calcul de l'expérience
  const experienceProgress = useMemo(() => {
    if (!garden) return { progress: 0, nextLevelXp: 100 };
    
    const currentLevel = garden.level || 1;
    const currentXp = garden.experience || 0;
    const nextLevelXp = Math.pow(currentLevel, 2) * 100;
    const currentLevelStartXp = Math.pow(currentLevel - 1, 2) * 100;
    const progress = Math.min(100, ((currentXp - currentLevelStartXp) / (nextLevelXp - currentLevelStartXp)) * 100);
    
    return { progress, nextLevelXp: nextLevelXp - currentXp };
  }, [garden?.level, garden?.experience]);

  if (!garden) return null;

  return (
    <div className="flex items-center justify-between gap-3 will-change-transform">
      {/* Niveau et XP */}
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
        <Star className="h-4 w-4 text-yellow-500" />
        <div className="text-sm font-semibold">Niv. {garden.level || 1}</div>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300"
            style={{ width: `${experienceProgress.progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2">
        {/* Pièces */}
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold">{garden.coins?.toLocaleString() || 0}</span>
        </div>

        {/* Gemmes */}
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
          <Gem className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold">{garden.gems || 0}</span>
        </div>

        {/* Récoltes */}
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
          <Trophy className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold">{garden.total_harvests || 0}</span>
        </div>
      </div>
    </div>
  );
});

PlayerStats.displayName = 'PlayerStats';

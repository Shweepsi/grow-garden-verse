
import { Coins, Sprout, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden }: GameHeaderProps) => {
  const { signOut } = useAuth();

  // Calculer l'XP nécessaire pour le prochain niveau
  const getXpForLevel = (level: number) => {
    return Math.pow(level, 2) * 100;
  };

  const currentLevel = garden?.level || 1;
  const currentXp = garden?.experience || 0;
  const xpForCurrentLevel = getXpForLevel(currentLevel - 1);
  const xpForNextLevel = getXpForLevel(currentLevel);
  const xpProgress = currentXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((xpProgress / xpNeeded) * 100, 100);

  return (
    <div className="relative z-20">
      <div className="mx-4 mt-4 mb-2">
        <div className="glassmorphism rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            {/* Logo et titre */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sprout className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                  Grow Garden
                </h1>
                <p className="text-xs text-gray-600">Cultivez votre paradis</p>
              </div>
            </div>
            
            {/* Statistiques */}
            <div className="flex items-center space-x-3">
              {/* Coins */}
              <div className="relative group">
                <div className="premium-card rounded-xl px-3 py-2 flex items-center space-x-2 shimmer">
                  <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Coins className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-bold text-yellow-700 text-sm">
                    {(garden?.coins || 0).toLocaleString()}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              {/* Niveau et XP */}
              <div className="relative group">
                <div className="premium-card rounded-xl px-3 py-2 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Star className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-blue-700 text-xs leading-tight">
                      Niveau {currentLevel}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="w-12 bg-gray-200 rounded-full h-1 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 relative"
                          style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                        </div>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        {Math.floor(progressPercentage)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              {/* Bouton déconnexion */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="glassmorphism border-red-200 text-red-600 hover:bg-red-50/50 hover:border-red-300 transition-all duration-300 backdrop-blur-sm"
              >
                <span className="text-xs">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

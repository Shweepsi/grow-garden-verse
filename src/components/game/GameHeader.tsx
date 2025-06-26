
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
    <div className="bg-white shadow-sm border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Sprout className="h-6 w-6 text-green-600" />
            <span className="text-lg font-bold text-green-800">Grow Garden</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1 rounded-full">
            <Coins className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800">{garden?.coins || 0}</span>
          </div>
          
          <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
            <Star className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="font-semibold text-blue-800 text-xs">Niveau {currentLevel}</span>
              <div className="flex items-center space-x-1">
                <Progress value={progressPercentage} className="w-16 h-1" />
                <span className="text-xs text-blue-600">{Math.floor(progressPercentage)}%</span>
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { Trophy, Star, Coins, TrendingUp, Clock, Target } from 'lucide-react';
interface PlayerStatsProps {
  garden: PlayerGarden | null;
  totalPlants: number;
  activePlants: number;
}
export const PlayerStats = ({
  garden,
  totalPlants,
  activePlants
}: PlayerStatsProps) => {
  if (!garden) return null;

  // Calculer l'XP nécessaire pour le prochain niveau
  const getXpForLevel = (level: number) => {
    return Math.pow(level, 2) * 100;
  };
  const currentLevel = garden.level;
  const currentXp = garden.experience;
  const xpForCurrentLevel = getXpForLevel(currentLevel - 1);
  const xpForNextLevel = getXpForLevel(currentLevel);
  const xpProgress = currentXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min(xpProgress / xpNeeded * 100, 100);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  return <div className="space-y-6">
      {/* Niveau et Expérience */}
      

      {/* Statistiques de jeu */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{garden.total_harvests}</p>
            <p className="text-xs text-gray-600">Récoltes totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{garden.coins}</p>
            <p className="text-xs text-gray-600">Pièces</p>
          </CardContent>
        </Card>

        

        <Card>
          
        </Card>
      </div>

      {/* Informations du compte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Informations du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Compte créé :</span>
            <span className="font-medium">{formatDate(garden.created_at)}</span>
          </div>
          
          
        </CardContent>
      </Card>
    </div>;
};
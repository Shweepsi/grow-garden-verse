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
  const formatDuration = (dateString: string) => {
    const start = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return "1 jour";
    return `${diffInDays} jours`;
  };
  return <div className="space-y-6">
      {/* Niveau et Expérience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Progression
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">Niveau {currentLevel}</span>
            <span className="text-sm text-gray-600">{currentXp.toLocaleString()} XP</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progrès vers le niveau {currentLevel + 1}</span>
              <span>{xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-gray-500 text-center">
              {Math.floor(progressPercentage)}% complété
            </p>
          </div>
        </CardContent>
      </Card>

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
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{activePlants}</p>
            <p className="text-xs text-gray-600">Plantes actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{garden.prestige_level}</p>
            <p className="text-xs text-gray-600">Niveau prestige</p>
          </CardContent>
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
          
          <div className="flex justify-between">
            <span className="text-gray-600">Multiplicateur permanent :</span>
            <span className="font-medium text-green-600">x{garden.permanent_multiplier}</span>
          </div>
        </CardContent>
      </Card>
    </div>;
};
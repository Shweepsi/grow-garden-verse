
import { GameHeader } from '@/components/game/GameHeader';
import { PlayerStats } from '@/components/game/PlayerStats';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { Loader2 } from 'lucide-react';

export const ProfilePage = () => {
  const { gameState, loading } = useRefactoredGame();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  // Calculer les statistiques
  const activePlants = gameState.plots.filter(plot => plot.plant_type && plot.planted_at).length;
  const totalPlants = gameState.plantTypes.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100">
      <GameHeader garden={gameState.garden} />
      
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-green-800 mb-6">Profil du Jardinier</h1>
        
        <PlayerStats 
          garden={gameState.garden} 
          totalPlants={totalPlants}
          activePlants={activePlants}
        />
      </div>
    </div>
  );
};

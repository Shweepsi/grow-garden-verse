import { GameHeader } from '@/components/game/GameHeader';
import { PlayerStats } from '@/components/game/PlayerStats';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { Loader2 } from 'lucide-react';

export const ProfilePage = () => {
  const { gameState, loading } = useRefactoredGame();

  if (loading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  // Calculer les statistiques
  const activePlants = gameState.plots.filter(plot => plot.plant_type && plot.planted_at).length;
  const totalPlants = gameState.plantTypes.length;

  return (
    <div className="min-h-screen garden-background">
      <GameHeader garden={gameState.garden} />
      
      <div className="p-3 pb-20">
        <h1 className="mobile-text-xl font-bold text-green-800 mb-4">Profil du Jardinier</h1>
        
        <PlayerStats 
          garden={gameState.garden} 
          totalPlants={totalPlants}
          activePlants={activePlants}
        />
      </div>
    </div>
  );
};

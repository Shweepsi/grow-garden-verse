
import { GameHeader } from '@/components/game/GameHeader';
import { PlayerStats } from '@/components/game/PlayerStats';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Settings } from 'lucide-react';

export const ProfilePage = () => {
  const { gameState, loading } = useRefactoredGame();
  const { signOut } = useAuth();

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
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameState.garden} />
      </div>
      
      {/* Content with padding to avoid overlap */}
      <div className="px-3 pb-6 space-y-4">
        <h1 className="mobile-text-xl font-bold text-green-800">Profil du Jardinier</h1>
        
        <PlayerStats 
          garden={gameState.garden} 
          totalPlants={totalPlants}
          activePlants={activePlants}
        />

        {/* Section Paramètres */}
        <div className="space-y-4">
          <h2 className="mobile-text-lg font-bold text-green-700 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres
          </h2>

          {/* Carte de déconnexion */}
          <div className="glassmorphism rounded-xl p-4 shadow-lg">
            <div className="space-y-3">
              <div>
                <h3 className="mobile-text-base font-semibold text-gray-800 mb-1">Compte</h3>
                <p className="mobile-text-sm text-gray-600">
                  Gérez votre compte et vos préférences
                </p>
              </div>
              
              <Button 
                onClick={signOut}
                variant="destructive" 
                size="lg"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 touch-target"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { GameHeader } from '@/components/garden/GameHeader';
import { PlayerStats } from '@/components/garden/PlayerStats';
import { PrestigeSystem } from '@/components/garden/PrestigeSystem';
import { LadderModal } from '@/components/garden/LadderModal';
import { PremiumStore } from '@/components/store/PremiumStore';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { useAuth } from '@/hooks/useAuth';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Settings, Trophy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
export const ProfilePage = () => {
  const navigate = useNavigate();
  const {
    gameState,
    loading
  } = useRefactoredGame();
  const {
    signOut
  } = useAuth();
  const queryClient = useQueryClient();
  const [showLadder, setShowLadder] = useState(false);

  // Gestion du bouton retour Android
  useAndroidBackButton(true, () => {
    navigate('/garden');
  });
  const handlePrestige = () => {
    // Invalider les queries pour rafraîchir les données
    queryClient.invalidateQueries({
      queryKey: ['gameData']
    });
  };
  if (loading) {
    return <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>;
  }

  // Calculer les statistiques
  const activePlants = gameState.plots.filter(plot => plot.plant_type && plot.planted_at).length;
  const totalPlants = gameState.plantTypes.length;
  return <div className="min-h-screen garden-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameState.garden} />
      </div>
    
      {/* Content with padding to avoid overlap */}
      <div className="px-3 pb-6 space-y-4">

          {/* Carte des classements */}
          <div className="glassmorphism rounded-xl p-4 shadow-lg">
            <div className="space-y-3">
              <div>
                <h3 className="mobile-text-base font-semibold text-gray-800 mb-1">Classements</h3>
                
              </div>
              
              <Button onClick={() => setShowLadder(true)} variant="outline" size="lg" className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 touch-target border-0">
                <Trophy className="h-4 w-4 mr-2" />
                Voir le Classement
              </Button>
            </div>
          </div>
        
        <h1 className="mobile-text-xl font-bold text-green-800">Profil du Jardinier</h1>
        
        <PlayerStats garden={gameState.garden} totalPlants={totalPlants} activePlants={activePlants} />
        
        {/* Boutique Premium */}
        <PremiumStore />
        
        {/* Système de Prestige */}
        {gameState.garden && <PrestigeSystem garden={gameState.garden} onPrestige={handlePrestige} />}

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
                
              </div>
              
              <Button onClick={signOut} variant="destructive" size="lg" className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 touch-target">
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale des classements */}
      <LadderModal isOpen={showLadder} onClose={() => setShowLadder(false)} />
    </div>;
};
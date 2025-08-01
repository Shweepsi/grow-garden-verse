import { GameHeader } from '@/components/garden/GameHeader';
import { PremiumStore } from '@/components/store/PremiumStore';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
export const StorePage = () => {
  const navigate = useNavigate();
  const {
    gameState,
    loading
  } = useRefactoredGame();

  // Gestion du bouton retour Android : retour au jardin
  useAndroidBackButton(true, () => {
    navigate('/garden');
  });
  if (loading) {
    return <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>;
  }
  return <div className="min-h-screen garden-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameState.garden} />
      </div>

      {/* Contenu principal */}
      <div className="px-3 pb-6 space-y-4">
        
        <PremiumStore />
      </div>
    </div>;
};
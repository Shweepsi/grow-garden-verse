
import { GameHeader } from '@/components/game/GameHeader';
import { useSimpleGame } from '@/hooks/useSimpleGame';

export const ShopPage = () => {
  const { gameState } = useSimpleGame();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100">
      <GameHeader garden={gameState.garden} />
      
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-green-800 mb-4">Boutique</h1>
        <p className="text-gray-600">Boutique en cours de développement...</p>
      </div>
    </div>
  );
};

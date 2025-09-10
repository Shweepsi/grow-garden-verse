
import { useOptimisticGameData } from './useOptimisticGameData';
import { usePlantActions } from './usePlantActions';
import { useGameEconomy } from './useGameEconomy';

export const useRefactoredGame = () => {
  // PHASE 1: Utiliser useOptimisticGameData pour une source de vérité unifiée
  const { gameData, isLoading } = useOptimisticGameData();
  const plantActions = usePlantActions();
  const economy = useGameEconomy();

  return {
    gameState: {
      garden: gameData?.garden || null,
      plots: gameData?.plots || [],
      plantTypes: gameData?.plantTypes || [],
    },
    loading: isLoading,
    ...plantActions,
    ...economy
  };
};

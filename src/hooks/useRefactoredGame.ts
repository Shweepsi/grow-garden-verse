
import { useGameData } from './useGameData';
import { usePlantActions } from './usePlantActions';
import { useGameEconomy } from './useGameEconomy';

export const useRefactoredGame = () => {
  const { data: gameData, isLoading } = useGameData();
  const plantActions = usePlantActions();
  const economy = useGameEconomy();

  return {
    gameState: {
      garden: gameData?.garden || null,
      plots: gameData?.plots || [],
      plantTypes: gameData?.plantTypes || [],
      activeEffects: gameData?.activeEffects || [],
      loading: false
    },
    loading: isLoading,
    ...plantActions,
    ...economy
  };
};

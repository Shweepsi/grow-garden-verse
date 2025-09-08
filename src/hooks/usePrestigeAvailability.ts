import { useGameData } from '@/hooks/useGameData';

export const usePrestigeAvailability = () => {
  const { data: gameData } = useGameData();
  
  if (!gameData?.garden) {
    return { isPrestigeAvailable: false };
  }

  const garden = gameData.garden;
  const prestigeLevel = garden.prestige_level || 0;
  const prestigeCostsCoins = [200_000, 500_000, 1_000_000];
  const prestigeCostsGems = [10, 25, 50];
  const costCoins = prestigeCostsCoins[prestigeLevel] || Infinity;
  const costGems = prestigeCostsGems[prestigeLevel] || Infinity;
  
  const isPrestigeAvailable = garden.coins >= costCoins && 
                              (garden.gems || 0) >= costGems && 
                              prestigeLevel < 3;

  return { isPrestigeAvailable };
};
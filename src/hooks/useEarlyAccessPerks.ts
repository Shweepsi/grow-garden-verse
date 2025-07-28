import { useGameData } from '@/hooks/useGameData';

/**
 * Hook simplifié pour les avantages Early Access
 * Utilise les données déjà chargées par useGameData pour éviter les requêtes supplémentaires
 */
export const useEarlyAccessPerks = () => {
  const { data: gameData, isLoading } = useGameData();
  
  const garden = gameData?.garden;
  
  // Vérifier si l'utilisateur a le multiplicateur Early Access
  const hasEarlyAccessMultiplier = () => {
    return (garden?.early_access_multiplier || 1.0) > 1.0;
  };

  // Obtenir la valeur du multiplicateur Early Access
  const getEarlyAccessMultiplier = () => {
    return garden?.early_access_multiplier || 1.0;
  };

  // Pour compatibilité avec l'ancien code (si nécessaire)
  const getActiveEarlyAccessPerks = () => {
    if (hasEarlyAccessMultiplier()) {
      return [{
        id: 'early_access',
        perk_type: 'early_access_coins_multiplier',
        perk_name: 'Early Access Pack - Multiplicateur X2 Pièces',
        multiplier_value: getEarlyAccessMultiplier(),
        is_active: true
      }];
    }
    return [];
  };

  return {
    userPerks: getActiveEarlyAccessPerks(), // Pour compatibilité
    isLoading,
    hasEarlyAccessMultiplier,
    getEarlyAccessMultiplier,
    getActiveEarlyAccessPerks
  };
};
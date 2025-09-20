
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';
import { UnifiedCalculationService } from '@/services/UnifiedCalculationService';
import { useAnimations } from '@/contexts/AnimationContext';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';

export const useUpgrades = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { triggerCoinAnimation, triggerGemAnimation } = useAnimations();
  const { collectAccumulatedCoinsAsync, currentAccumulation } = usePassiveIncomeRobot();

  const { data: availableUpgrades = [], isLoading: upgradesLoading } = useQuery({
    queryKey: ['levelUpgrades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_upgrades')
        .select('*')
        .order('level_required');
      
      if (error) throw error;
      return data as LevelUpgrade[];
    }
  });

  const { data: playerUpgrades = [], isLoading: playerUpgradesLoading } = useQuery({
    queryKey: ['playerUpgrades', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('player_upgrades')
        .select(`
          *,
          level_upgrades(*)
        `)
        .eq('user_id', user.id)
        .eq('active', true);
      
      if (error) throw error;
      return data as PlayerUpgrade[];
    },
    enabled: !!user?.id
  });

  const purchaseUpgradeMutation = useMutation({
    mutationFn: async ({ upgradeId, costCoins, costGems }: { 
      upgradeId: string; 
      costCoins: number; 
      costGems: number; 
    }) => {
      if (!user?.id) throw new Error('Non authentifié');

      // Vérifier les fonds avec protection des 100 pièces
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, gems')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Jardin non trouvé');
      
      // Utiliser EconomyService pour vérifier si on peut acheter l'amélioration
      if (garden.coins < (costCoins + 100)) { // Keep 100 coins reserve
        throw new Error('Pas assez de pièces (gardez 100 pièces de réserve)');
      }
      
      if ((garden.gems || 0) < costGems) {
        throw new Error('Pas assez de gemmes');
      }

      // Vérifier si l'amélioration existe déjà (désactivée)
      const { data: existingUpgrade } = await supabase
        .from('player_upgrades')
        .select('id')
        .eq('user_id', user.id)
        .eq('upgrade_id', upgradeId)
        .single();

      let upgradeError;
      if (existingUpgrade) {
        // Réactiver l'amélioration existante
        const result = await supabase
          .from('player_upgrades')
          .update({ active: true })
          .eq('user_id', user.id)
          .eq('upgrade_id', upgradeId);
        upgradeError = result.error;
      } else {
        // Créer une nouvelle amélioration
        const result = await supabase
          .from('player_upgrades')
          .insert({
            user_id: user.id,
            upgrade_id: upgradeId
          });
        upgradeError = result.error;
      }

      if (upgradeError) throw upgradeError;

      // Déduire le coût
      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: (garden.coins || 0) - costCoins,
          gems: (garden.gems || 0) - costGems
        })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;

      // Enregistrer la transaction
      if (costCoins > 0) {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: -costCoins,
            transaction_type: 'upgrade',
            description: `Achat amélioration`
          });
      }
    },
    onSuccess: async (data, variables) => {
      // Récupérer l'upgrade acheté pour vérifier son type
      const upgradePurchased = availableUpgrades.find(u => u.id === variables.upgradeId);
      
      queryClient.invalidateQueries({ queryKey: ['playerUpgrades'] });
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      
      // Animations de soustraction pour les coûts
      if (variables.costCoins > 0) {
        triggerCoinAnimation(-variables.costCoins);
      }
      if (variables.costGems > 0) {
        triggerGemAnimation(-variables.costGems);
      }
      
      // Auto-collecte du robot si c'est une amélioration robot et qu'il y a des pièces accumulées
      if (upgradePurchased && (upgradePurchased.effect_type === 'auto_harvest' || upgradePurchased.effect_type === 'robot_level') && currentAccumulation > 0) {
        console.log(`🤖 Amélioration robot achetée, collecte automatique de ${currentAccumulation} pièces`);
        setTimeout(() => {
          collectAccumulatedCoinsAsync().catch(console.error);
        }, 1000); // Délai pour laisser les données se synchroniser
      }
      
      toast.success('Amélioration achetée !', {
        description: 'Votre bonus est maintenant actif'
      });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'achat', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  const purchaseUpgrade = (upgradeId: string, costCoins: number, costGems: number) => {
    purchaseUpgradeMutation.mutate({ upgradeId, costCoins, costGems });
  };

  const isUpgradePurchased = (upgradeId: string) => {
    return playerUpgrades.some(pu => pu.upgrade_id === upgradeId);
  };

  // Calculer tous les multiplicateurs actifs
  const getActiveMultipliers = () => {
    return UnifiedCalculationService.calculateActiveMultipliers(playerUpgrades);
  };

  // Obtenir les améliorations de déblocage automatique
  const getAutoUnlockUpgrades = () => {
    return playerUpgrades.filter(upgrade => 
      upgrade.level_upgrades?.effect_type === 'auto_unlock'
    );
  };

  // Grouper les améliorations par catégorie et afficher tous les paliers
  const getSequentialUpgrades = () => {
    const categories: { [key: string]: LevelUpgrade[] } = {};
    
    // Grouper par effect_type
    availableUpgrades.forEach(upgrade => {
      if (!categories[upgrade.effect_type]) {
        categories[upgrade.effect_type] = [];
      }
      categories[upgrade.effect_type].push(upgrade);
    });

    // Pour chaque catégorie, trier par niveau requis et coût
    const sequentialUpgrades: LevelUpgrade[] = [];
    
    Object.entries(categories).forEach(([effectType, upgrades]) => {
      const sorted = upgrades.sort((a, b) => {
        if (a.level_required !== b.level_required) {
          return a.level_required - b.level_required;
        }
        return a.cost_coins - b.cost_coins;
      });

      // Ajouter tous les paliers pour cette catégorie
      sequentialUpgrades.push(...sorted);
    });

    return sequentialUpgrades;
  };

  // Nouvelle fonction pour obtenir les paliers d'une catégorie
  const getCategoryTiers = (effectType: string) => {
    const categoryUpgrades = availableUpgrades.filter(upgrade => upgrade.effect_type === effectType);
    return categoryUpgrades.sort((a, b) => {
      if (a.level_required !== b.level_required) {
        return a.level_required - b.level_required;
      }
      return a.cost_coins - b.cost_coins;
    });
  };

  // Calculer la progression par catégorie
  const getCategoryProgress = () => {
    const categories: { [key: string]: { total: number; purchased: number; name: string } } = {};
    
    availableUpgrades.forEach(upgrade => {
      if (!categories[upgrade.effect_type]) {
        categories[upgrade.effect_type] = {
          total: 0,
          purchased: 0,
          name: getCategoryDisplayName(upgrade.effect_type)
        };
      }
      categories[upgrade.effect_type].total++;
      if (isUpgradePurchased(upgrade.id)) {
        categories[upgrade.effect_type].purchased++;
      }
    });

    return categories;
  };

  const getCategoryDisplayName = (effectType: string) => {
    switch (effectType) {
      case 'harvest_multiplier': return 'Récolte';
      case 'growth_speed': return 'Croissance';
      case 'exp_multiplier': return 'Expérience';
      case 'gem_chance': return 'Gemmes';
      case 'plant_cost_reduction': return 'Économie';
      case 'auto_harvest': return 'Automatisation';
      case 'robot_level': return 'Automatisation';
      default: return effectType.replace('_', ' ');
    }
  };

  return {
    availableUpgrades,
    playerUpgrades,
    upgradesLoading: upgradesLoading || playerUpgradesLoading,
    purchaseUpgrade,
    isUpgradePurchased,
    getActiveMultipliers,
    getAutoUnlockUpgrades,
    getSequentialUpgrades,
    getCategoryProgress,
    getCategoryDisplayName,
    getCategoryTiers,
    isPurchasing: purchaseUpgradeMutation.isPending
  };
};

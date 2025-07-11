
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';
import { EconomyService } from '@/services/EconomyService';

export const useUpgrades = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      if (!EconomyService.canAffordUpgrade(garden.coins, costCoins)) {
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
          coins: garden.coins - costCoins,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerUpgrades'] });
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
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
    return EconomyService.calculateActiveMultipliers(playerUpgrades);
  };

  // Obtenir les améliorations de déblocage automatique
  const getAutoUnlockUpgrades = () => {
    return playerUpgrades.filter(upgrade => 
      upgrade.level_upgrades?.effect_type === 'auto_unlock'
    );
  };

  // Grouper les améliorations par catégorie et ne montrer que la suivante
  const getSequentialUpgrades = () => {
    const categories: { [key: string]: LevelUpgrade[] } = {};
    
    // Grouper par effect_type
    availableUpgrades.forEach(upgrade => {
      if (!categories[upgrade.effect_type]) {
        categories[upgrade.effect_type] = [];
      }
      categories[upgrade.effect_type].push(upgrade);
    });

    // Pour chaque catégorie, trier par niveau requis et coût, puis prendre seulement la suivante non-achetée
    const sequentialUpgrades: LevelUpgrade[] = [];
    
    Object.entries(categories).forEach(([effectType, upgrades]) => {
      const sorted = upgrades.sort((a, b) => {
        if (a.level_required !== b.level_required) {
          return a.level_required - b.level_required;
        }
        return a.cost_coins - b.cost_coins;
      });

      // Trouver la prochaine amélioration non-achetée
      const nextUpgrade = sorted.find(upgrade => !isUpgradePurchased(upgrade.id));
      if (nextUpgrade) {
        sequentialUpgrades.push(nextUpgrade);
      }
    });

    return sequentialUpgrades;
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
    isPurchasing: purchaseUpgradeMutation.isPending
  };
};

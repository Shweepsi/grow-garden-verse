
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

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
        .eq('user_id', user.id);
      
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

      // Vérifier les fonds
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, gems')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Jardin non trouvé');
      if (garden.coins < costCoins) throw new Error('Pas assez de pièces');
      if ((garden.gems || 0) < costGems) throw new Error('Pas assez de gemmes');

      // Acheter l'amélioration
      const { error: upgradeError } = await supabase
        .from('player_upgrades')
        .insert({
          user_id: user.id,
          upgrade_id: upgradeId
        });

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
      toast.success('Amélioration achetée !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'achat');
    }
  });

  const purchaseUpgrade = (upgradeId: string, costCoins: number, costGems: number) => {
    purchaseUpgradeMutation.mutate({ upgradeId, costCoins, costGems });
  };

  const isUpgradePurchased = (upgradeId: string) => {
    return playerUpgrades.some(pu => pu.upgrade_id === upgradeId);
  };

  const getActiveMultipliers = () => {
    const multipliers = {
      harvest: 1,
      growth: 1
    };

    playerUpgrades.forEach(upgrade => {
      const levelUpgrade = upgrade.level_upgrades;
      if (!levelUpgrade) return;

      if (levelUpgrade.effect_type === 'harvest_multiplier') {
        multipliers.harvest *= levelUpgrade.effect_value;
      } else if (levelUpgrade.effect_type === 'growth_speed') {
        multipliers.growth *= levelUpgrade.effect_value;
      }
    });

    return multipliers;
  };

  return {
    availableUpgrades,
    playerUpgrades,
    upgradesLoading: upgradesLoading || playerUpgradesLoading,
    purchaseUpgrade,
    isUpgradePurchased,
    getActiveMultipliers,
    isPurchasing: purchaseUpgradeMutation.isPending
  };
};


import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { EconomyService } from '@/services/EconomyService';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { useAnimations } from '@/contexts/AnimationContext';

export const useGameEconomy = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getBoostMultiplier } = useActiveBoosts();
  const { triggerCoinAnimation } = useAnimations();

  const unlockPlotMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: costData } = await supabase.rpc('get_plot_unlock_cost', { plot_number: plotNumber });
      const cost = costData || 0;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) {
        throw new Error('Jardin non trouvé');
      }

      if (!EconomyService.canAffordUpgrade(garden.coins, cost)) {
        throw new Error('Pas assez de pièces (minimum 100 pièces à conserver)');
      }

      await supabase
        .from('garden_plots')
        .update({ unlocked: true })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      await supabase
        .from('player_gardens')
        .update({
          coins: (garden.coins || 0) - cost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'unlock',
          description: `Déblocage parcelle ${plotNumber}`
        });
      
      return { cost };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      
      // Animation de soustraction des pièces pour le déblocage
      triggerCoinAnimation(-data.cost);
      
      toast.success('Parcelle débloquée !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du déblocage');
    }
  });

  // Fonction pour appliquer les boosts aux gains de pièces
  const applyCoinsBoost = (amount: number): number => {
    const coinBoostMultiplier = getBoostMultiplier('coin_boost');
    return Math.floor(amount * coinBoostMultiplier);
  };

  // Fonction pour appliquer les boosts aux gains de gemmes
  const applyGemsBoost = (amount: number): number => {
    const gemBoostMultiplier = getBoostMultiplier('gem_boost');
    return Math.floor(amount * gemBoostMultiplier);
  };

  return {
    unlockPlot: (plotNumber: number) => unlockPlotMutation.mutate(plotNumber),
    isUnlocking: unlockPlotMutation.isPending,
    applyCoinsBoost,
    applyGemsBoost
  };
};

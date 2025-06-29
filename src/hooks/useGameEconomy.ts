
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GameBalanceService } from '@/services/GameBalanceService';
import { EconomyService } from '@/services/EconomyService';

export const useGameEconomy = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const unlockPlotMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const cost = GameBalanceService.getUnlockCost(plotNumber);

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) {
        throw new Error('Jardin non trouvé');
      }

      // Utiliser la même logique que pour les améliorations avec protection des 100 pièces
      if (!EconomyService.canAffordUpgrade(garden.coins, cost)) {
        throw new Error('Pas assez de pièces (minimum 100 pièces à conserver)');
      }

      // Unlock plot
      await supabase
        .from('garden_plots')
        .update({ unlocked: true })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      // Deduct coins
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - cost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'unlock',
          description: `Déblocage parcelle ${plotNumber}`
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Parcelle débloquée !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du déblocage');
    }
  });

  return {
    unlockPlot: (plotNumber: number) => unlockPlotMutation.mutate(plotNumber),
    isUnlocking: unlockPlotMutation.isPending
  };
};

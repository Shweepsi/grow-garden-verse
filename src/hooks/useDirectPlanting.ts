
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, cost }: { plotNumber: number; plantTypeId: string; cost: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Vérifier les fonds
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden || garden.coins < cost) {
        throw new Error('Pas assez de pièces');
      }

      // Obtenir les infos de la plante
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Type de plante non trouvé');

      // Planter directement
      await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: new Date().toISOString(),
          growth_time_minutes: plantType.base_growth_minutes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      // Déduire le coût
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - cost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'plant_direct',
          description: `Plantation directe de ${plantType.display_name}`
        });

      toast.success(`${plantType.display_name} plantée ! Elle sera prête dans ${PlantGrowthService.formatTimeRemaining(plantType.base_growth_minutes || 1)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  return {
    plantDirect: (plotNumber: number, plantTypeId: string, cost: number) => 
      plantDirectMutation.mutate({ plotNumber, plantTypeId, cost }),
    isPlanting: plantDirectMutation.isPending
  };
};

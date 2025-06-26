
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GameBalanceService } from '@/services/GameBalanceService';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const buyAndPlantMutation = useMutation({
    mutationFn: async ({ 
      plotNumber, 
      seedPrice, 
      plantTypeId, 
      seedName 
    }: { 
      plotNumber: number; 
      seedPrice: number;
      plantTypeId: string;
      seedName: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Vérifier si l'utilisateur a assez de pièces
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden || garden.coins < seedPrice) {
        throw new Error('Pas assez de pièces');
      }

      // Obtenir les infos de la plante
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Type de plante non trouvé');

      // Planter directement sans passer par l'inventaire
      const { error: plantError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          plant_stage: 0, // Commence à l'étape 0
          plant_water_count: 0,
          planted_at: new Date().toISOString(),
          growth_time_minutes: null, // Plus utilisé dans le nouveau système
          last_watered: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plantError) throw plantError;

      // Déduire les pièces
      const { error: coinsError } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - seedPrice,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (coinsError) throw coinsError;

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -seedPrice,
          transaction_type: 'direct_purchase',
          description: `Achat direct et plantation de ${seedName}`
        });

      return { plantType, seedPrice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Graine achetée et plantée avec succès !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'achat');
    }
  });

  return {
    buyAndPlant: (plotNumber: number, seedPrice: number, plantTypeId: string, seedName: string) =>
      buyAndPlantMutation.mutate({ plotNumber, seedPrice, plantTypeId, seedName }),
    isBuying: buyAndPlantMutation.isPending
  };
};


import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useToolApplication = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const applyToolMutation = useMutation({
    mutationFn: async ({ plotNumber, toolId, cost }: { plotNumber: number; toolId: string; cost: number }) => {
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

      // Obtenir les infos de l'outil
      const { data: tool } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', toolId)
        .single();

      if (!tool) throw new Error('Outil non trouvé');

      const effects = tool.effects as any;

      // Appliquer l'effet selon le type d'outil
      if (effects.instant_growth) {
        // Potion de croissance - compléter instantanément
        await supabase
          .from('garden_plots')
          .update({
            planted_at: new Date(Date.now() - (60 * 60 * 1000)).toISOString() // 1h dans le passé
          })
          .eq('user_id', user.id)
          .eq('plot_number', plotNumber)
          .not('plant_type', 'is', null);
      } else if (effects.growth_boost && effects.duration) {
        // Engrais - effet temporaire
        await supabase
          .from('active_effects')
          .insert({
            user_id: user.id,
            effect_type: 'growth_boost',
            effect_value: effects.growth_boost,
            expires_at: new Date(Date.now() + effects.duration * 1000).toISOString()
          });
      } else if (effects.water_all) {
        // Arrosoir - arroser toutes les plantes (pour futur système d'arrosage)
        await supabase
          .from('garden_plots')
          .update({
            last_watered: new Date().toISOString(),
            plant_water_count: 1
          })
          .eq('user_id', user.id)
          .not('plant_type', 'is', null);
      }

      // Déduire le coût
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - cost
        })
        .eq('user_id', user.id);

      // Enregistrer l'utilisation
      await supabase
        .from('tool_uses')
        .insert({
          user_id: user.id,
          shop_item_id: toolId,
          plot_number: plotNumber,
          effect_applied: effects
        });

      toast.success(`${tool.display_name} appliqué avec succès !`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'application de l\'outil');
    }
  });

  return {
    applyTool: (plotNumber: number, toolId: string, cost: number) => 
      applyToolMutation.mutate({ plotNumber, toolId, cost }),
    isApplying: applyToolMutation.isPending
  };
};

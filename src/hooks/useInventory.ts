
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  quantity: number;
  purchased_at: string;
  shop_item: {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    item_type: string;
    emoji: string | null;
    effects: any;
  };
}

export const useInventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ['inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('player_inventory_items')
        .select(`
          id,
          quantity,
          purchased_at,
          shop_item:shop_items (
            id,
            name,
            display_name,
            description,
            item_type,
            emoji,
            effects
          )
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user?.id
  });

  // Use tool mutation
  const useToolMutation = useMutation({
    mutationFn: async ({ inventoryItemId, plotNumber }: { inventoryItemId: string; plotNumber?: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const inventoryItem = inventoryItems.find(item => item.id === inventoryItemId);
      if (!inventoryItem) throw new Error('Item not found in inventory');

      const toolEffects = inventoryItem.shop_item.effects || {};

      // Apply tool effects based on tool type
      if (inventoryItem.shop_item.name === 'watering_can') {
        // Water all plants
        const { data: plots, error: plotsError } = await supabase
          .from('garden_plots')
          .select('*')
          .eq('user_id', user.id)
          .not('plant_type', 'is', null);

        if (plotsError) throw plotsError;

        for (const plot of plots) {
          const { error } = await supabase
            .from('garden_plots')
            .update({
              plant_water_count: plot.plant_water_count + 1,
              last_watered: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', plot.id);

          if (error) throw error;
        }

        toast.success('Toutes les plantes ont été arrosées !');
      } else if (inventoryItem.shop_item.name === 'fertilizer' && plotNumber) {
        // Apply fertilizer to specific plot
        const { error } = await supabase
          .from('active_effects')
          .insert({
            user_id: user.id,
            effect_type: 'growth_boost',
            effect_value: 2,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
          });

        if (error) throw error;

        // Record tool use
        await supabase
          .from('tool_uses')
          .insert({
            user_id: user.id,
            shop_item_id: inventoryItem.shop_item.id,
            plot_number: plotNumber,
            effect_applied: { growth_boost: 2, duration: '24h' }
          });

        toast.success('Engrais appliqué ! Croissance accélérée pendant 24h');
      } else if (inventoryItem.shop_item.name === 'golden_shovel') {
        // Activate golden shovel effect
        const { error } = await supabase
          .from('active_effects')
          .insert({
            user_id: user.id,
            effect_type: 'harvest_multiplier',
            effect_value: 2,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h
          });

        if (error) throw error;

        toast.success('Pelle dorée activée ! Récompenses doublées pendant 1h');
      }

      // Decrease quantity (except for permanent tools)
      if (!['watering_can', 'golden_shovel'].includes(inventoryItem.shop_item.name)) {
        if (inventoryItem.quantity <= 1) {
          // Remove item if quantity becomes 0
          await supabase
            .from('player_inventory_items')
            .delete()
            .eq('id', inventoryItemId);
        } else {
          // Decrease quantity
          await supabase
            .from('player_inventory_items')
            .update({ quantity: inventoryItem.quantity - 1 })
            .eq('id', inventoryItemId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'utilisation');
      console.error(error);
    }
  });

  const useTool = (inventoryItemId: string, plotNumber?: number) => {
    useToolMutation.mutate({ inventoryItemId, plotNumber });
  };

  // Get items by type
  const getItemsByType = (type: string) => {
    return inventoryItems.filter(item => item.shop_item.item_type === type);
  };

  const seeds = getItemsByType('seed');
  const tools = getItemsByType('tool');
  const upgrades = getItemsByType('upgrade');

  return {
    inventoryItems,
    seeds,
    tools,
    upgrades,
    loading: isLoading,
    useTool,
    usingTool: useToolMutation.isPending,
    getItemsByType
  };
};

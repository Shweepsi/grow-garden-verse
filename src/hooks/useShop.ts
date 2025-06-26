
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ShopItem {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  item_type: string;
  price: number;
  emoji: string | null;
  rarity: string;
  is_premium: boolean;
  effects: any;
  available: boolean;
  is_daily_special: boolean;
  rotation_date: string;
}

export const useShop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch shop items (excluding seeds)
  const { data: shopItems = [], isLoading } = useQuery({
    queryKey: ['shopItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('available', true)
        .neq('item_type', 'seed') // Exclude seeds from shop
        .order('item_type', { ascending: true })
        .order('price', { ascending: true });

      if (error) throw error;
      return data as ShopItem[];
    }
  });

  // Purchase item mutation
  const purchaseItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity = 1 }: { itemId: string; quantity?: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const item = shopItems.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');

      const totalCost = item.price * quantity;

      // Check if user has enough coins
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (gardenError) throw gardenError;
      if ((garden.coins || 0) < totalCost) {
        throw new Error('Pas assez de pièces');
      }

      // Deduct coins
      const { error: updateError } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - totalCost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Add item to inventory (check if exists first)
      const { data: existingItem } = await supabase
        .from('player_inventory_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('shop_item_id', itemId)
        .single();

      if (existingItem) {
        await supabase
          .from('player_inventory_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('player_inventory_items')
          .insert({
            user_id: user.id,
            shop_item_id: itemId,
            quantity
          });
      }

      // Record purchase history and transaction
      await Promise.all([
        supabase.from('purchase_history').insert({
          user_id: user.id,
          shop_item_id: itemId,
          quantity,
          total_cost: totalCost
        }),
        supabase.from('coin_transactions').insert({
          user_id: user.id,
          amount: -totalCost,
          transaction_type: 'purchase',
          description: `Achat de ${item.display_name} x${quantity}`
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Achat effectué avec succès !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'achat');
    }
  });

  const purchaseItem = (itemId: string, quantity = 1) => {
    purchaseItemMutation.mutate({ itemId, quantity });
  };

  return {
    shopItems,
    loading: isLoading,
    purchaseItem,
    purchasing: purchaseItemMutation.isPending
  };
};

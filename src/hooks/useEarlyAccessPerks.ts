import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPerk } from '@/types/game';

export const useEarlyAccessPerks = () => {
  const { user } = useAuth();

  const { data: userPerks = [], isLoading } = useQuery({
    queryKey: ['userPerks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_perks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as UserPerk[];
    },
    enabled: !!user?.id
  });

  // Vérifier si l'utilisateur a le multiplicateur Early Access
  const hasEarlyAccessMultiplier = () => {
    return userPerks.some(perk => 
      perk.perk_type === 'early_access_coins_multiplier' && 
      perk.is_active
    );
  };

  // Obtenir la valeur du multiplicateur Early Access
  const getEarlyAccessMultiplier = () => {
    const perk = userPerks.find(perk => 
      perk.perk_type === 'early_access_coins_multiplier' && 
      perk.is_active
    );
    return perk?.multiplier_value || 1.0;
  };

  // Obtenir tous les multiplicateurs Early Access actifs
  const getActiveEarlyAccessPerks = () => {
    return userPerks.filter(perk => 
      perk.perk_type.includes('multiplier') && 
      perk.is_active
    );
  };

  return {
    userPerks,
    isLoading,
    hasEarlyAccessMultiplier,
    getEarlyAccessMultiplier,
    getActiveEarlyAccessPerks
  };
};
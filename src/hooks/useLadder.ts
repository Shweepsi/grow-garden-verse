import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardPlayer {
  user_id: string;
  total_harvests: number;
  coins: number;
  level: number;
  prestige_level: number;
  profiles?: {
    username: string;
  };
}

export const useLadder = () => {
  const { user } = useAuth();

  // Classement par récoltes totales
  const { data: harvestLeaders = [], isLoading: harvestLoading } = useQuery({
    queryKey: ['leaderboard', 'harvests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_gardens')
        .select(`
          user_id,
          total_harvests,
          profiles(username)
        `)
        .order('total_harvests', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LeaderboardPlayer[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Classement par pièces
  const { data: coinsLeaders = [], isLoading: coinsLoading } = useQuery({
    queryKey: ['leaderboard', 'coins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_gardens')
        .select(`
          user_id,
          coins,
          profiles(username)
        `)
        .order('coins', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LeaderboardPlayer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Classement par niveau de prestige
  const { data: prestigeLeaders = [], isLoading: prestigeLoading } = useQuery({
    queryKey: ['leaderboard', 'prestige'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_gardens')
        .select(`
          user_id,
          prestige_level,
          profiles(username)
        `)
        .order('prestige_level', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LeaderboardPlayer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Classement par niveau
  const { data: levelLeaders = [], isLoading: levelLoading } = useQuery({
    queryKey: ['leaderboard', 'level'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_gardens')
        .select(`
          user_id,
          level,
          experience,
          profiles(username)
        `)
        .order('level', { ascending: false })
        .order('experience', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LeaderboardPlayer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Position du joueur actuel dans chaque classement
  const { data: currentUserRanks = {} } = useQuery({
    queryKey: ['userRanks', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const [harvestRank, coinsRank, prestigeRank, levelRank] = await Promise.all([
        // Rang par récoltes
        supabase.rpc('get_user_harvest_rank', { target_user_id: user.id }),
        // Rang par pièces
        supabase.rpc('get_user_coins_rank', { target_user_id: user.id }),
        // Rang par prestige
        supabase.rpc('get_user_prestige_rank', { target_user_id: user.id }),
        // Rang par niveau
        supabase.rpc('get_user_level_rank', { target_user_id: user.id }),
      ]);

      return {
        harvests: harvestRank.data ? { rank: harvestRank.data } : null,
        coins: coinsRank.data ? { rank: coinsRank.data } : null,
        prestige: prestigeRank.data ? { rank: prestigeRank.data } : null,
        level: levelRank.data ? { rank: levelRank.data } : null,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    harvestLeaders,
    coinsLeaders,
    prestigeLeaders,
    levelLeaders,
    currentUserRanks,
    loading: harvestLoading || coinsLoading || prestigeLoading || levelLoading,
  };
};
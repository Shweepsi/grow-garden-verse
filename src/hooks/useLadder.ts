import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardPlayer {
  user_id?: string;
  id?: string;
  username: string;
  total_harvests: number;
  coins: number;
  level: number;
  prestige_level: number;
  experience?: number;
  is_bot?: boolean;
  premium_status?: boolean;
}

export const useLadder = () => {
  const { user } = useAuth();

  // Classement par récoltes totales
  const { data: harvestLeaders = [], isLoading: harvestLoading } = useQuery({
    queryKey: ['leaderboard', 'harvests'],
    queryFn: async () => {
      // Récupérer les joueurs réels avec leurs profils et statut premium
      const { data: gardens, error: gardensError } = await supabase
        .from('player_gardens')
        .select('user_id, total_harvests, premium_status, created_at');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      // Récupérer les bots
      const { data: bots, error: botsError } = await supabase
        .from('leaderboard_bots')
        .select('id, username, total_harvests, created_at');

      if (gardensError) throw gardensError;
      if (profilesError) throw profilesError;
      if (botsError) throw botsError;

      // Créer un map des profils pour une recherche rapide
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Combiner et formater les données
      const allPlayers: (LeaderboardPlayer & { created_at: string })[] = [
        ...(gardens || []).map(g => ({
          user_id: g.user_id,
          username: profileMap.get(g.user_id) || 'Jardinier Anonyme',
          total_harvests: g.total_harvests,
          coins: 0,
          level: 0,
          prestige_level: 0,
          premium_status: g.premium_status || false,
          is_bot: false,
          created_at: g.created_at
        })),
        ...(bots || []).map(b => ({
          id: b.id,
          username: b.username,
          total_harvests: b.total_harvests,
          coins: 0,
          level: 0,
          prestige_level: 0,
          is_bot: true,
          created_at: b.created_at
        }))
      ];

      // Trier par récoltes décroissantes, puis par date croissante en cas d'égalité, et limiter à 100
      return allPlayers
        .sort((a, b) => {
          if (b.total_harvests !== a.total_harvests) return b.total_harvests - a.total_harvests;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .slice(0, 100);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Classement par pièces
  const { data: coinsLeaders = [], isLoading: coinsLoading } = useQuery({
    queryKey: ['leaderboard', 'coins'],
    queryFn: async () => {
      // Récupérer les joueurs réels avec leurs profils
      const { data: gardens, error: gardensError } = await supabase
        .from('player_gardens')
        .select('user_id, coins, premium_status, created_at');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      // Récupérer les bots
      const { data: bots, error: botsError } = await supabase
        .from('leaderboard_bots')
        .select('id, username, coins, created_at');

      if (gardensError) throw gardensError;
      if (profilesError) throw profilesError;
      if (botsError) throw botsError;

      // Créer un map des profils pour une recherche rapide
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Combiner et formater les données
      const allPlayers: (LeaderboardPlayer & { created_at: string })[] = [
        ...(gardens || []).map(g => ({
          user_id: g.user_id,
          username: profileMap.get(g.user_id) || 'Jardinier Anonyme',
          total_harvests: 0,
          coins: g.coins,
          level: 0,
          prestige_level: 0,
          premium_status: g.premium_status || false,
          is_bot: false,
          created_at: g.created_at
        })),
        ...(bots || []).map(b => ({
          id: b.id,
          username: b.username,
          total_harvests: 0,
          coins: b.coins,
          level: 0,
          prestige_level: 0,
          is_bot: true,
          created_at: b.created_at
        }))
      ];

      // Trier par pièces décroissantes, puis par date croissante en cas d'égalité, et limiter à 100
      return allPlayers
        .sort((a, b) => {
          if (b.coins !== a.coins) return b.coins - a.coins;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .slice(0, 100);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Classement par niveau de prestige
  const { data: prestigeLeaders = [], isLoading: prestigeLoading } = useQuery({
    queryKey: ['leaderboard', 'prestige'],
    queryFn: async () => {
      // Récupérer les joueurs réels avec leurs profils
      const { data: gardens, error: gardensError } = await supabase
        .from('player_gardens')
        .select('user_id, prestige_level, premium_status, created_at');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      // Récupérer les bots
      const { data: bots, error: botsError } = await supabase
        .from('leaderboard_bots')
        .select('id, username, prestige_level, created_at');

      if (gardensError) throw gardensError;
      if (profilesError) throw profilesError;
      if (botsError) throw botsError;

      // Créer un map des profils pour une recherche rapide
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Combiner et formater les données
      const allPlayers: (LeaderboardPlayer & { created_at: string })[] = [
        ...(gardens || []).map(g => ({
          user_id: g.user_id,
          username: profileMap.get(g.user_id) || 'Jardinier Anonyme',
          total_harvests: 0,
          coins: 0,
          level: 0,
          prestige_level: g.prestige_level || 0,
          premium_status: g.premium_status || false,
          is_bot: false,
          created_at: g.created_at
        })),
        ...(bots || []).map(b => ({
          id: b.id,
          username: b.username,
          total_harvests: 0,
          coins: 0,
          level: 0,
          prestige_level: b.prestige_level || 0,
          is_bot: true,
          created_at: b.created_at
        }))
      ];

      // Trier par prestige décroissant, puis par date croissante en cas d'égalité, et limiter à 100
      return allPlayers
        .sort((a, b) => {
          if (b.prestige_level !== a.prestige_level) return b.prestige_level - a.prestige_level;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .slice(0, 100);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Classement par niveau
  const { data: levelLeaders = [], isLoading: levelLoading } = useQuery({
    queryKey: ['leaderboard', 'level'],
    queryFn: async () => {
      // Récupérer les joueurs réels avec leurs profils
      const { data: gardens, error: gardensError } = await supabase
        .from('player_gardens')
        .select('user_id, level, experience, premium_status, created_at');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      // Récupérer les bots
      const { data: bots, error: botsError } = await supabase
        .from('leaderboard_bots')
        .select('id, username, level, experience, created_at');

      if (gardensError) throw gardensError;
      if (profilesError) throw profilesError;
      if (botsError) throw botsError;

      // Créer un map des profils pour une recherche rapide
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Combiner et formater les données
      const allPlayers: (LeaderboardPlayer & { created_at: string })[] = [
        ...(gardens || []).map(g => ({
          user_id: g.user_id,
          username: profileMap.get(g.user_id) || 'Jardinier Anonyme',
          total_harvests: 0,
          coins: 0,
          level: g.level || 1,
          experience: g.experience || 0,
          prestige_level: 0,
          premium_status: g.premium_status || false,
          is_bot: false,
          created_at: g.created_at
        })),
        ...(bots || []).map(b => ({
          id: b.id,
          username: b.username,
          total_harvests: 0,
          coins: 0,
          level: b.level || 1,
          experience: b.experience || 0,
          prestige_level: 0,
          is_bot: true,
          created_at: b.created_at
        }))
      ];

      // Trier par niveau puis expérience décroissants, puis par date croissante en cas d'égalité, et limiter à 100
      return allPlayers
        .sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          if ((b.experience || 0) !== (a.experience || 0)) return (b.experience || 0) - (a.experience || 0);
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .slice(0, 100);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Position du joueur actuel dans chaque classement
  const { data: currentUserRanks = {} } = useQuery({
    queryKey: ['userRanks', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const [harvestRank, coinsRank, prestigeRank, levelRank, userGarden] = await Promise.all([
        // Rang par récoltes
        supabase.rpc('get_user_harvest_rank', { target_user_id: user.id }),
        // Rang par pièces
        supabase.rpc('get_user_coins_rank', { target_user_id: user.id }),
        // Rang par prestige
        supabase.rpc('get_user_prestige_rank', { target_user_id: user.id }),
        // Rang par niveau
        supabase.rpc('get_user_level_rank', { target_user_id: user.id }),
        // Statut premium du joueur
        supabase.from('player_gardens').select('premium_status').eq('user_id', user.id).single(),
      ]);

      const premiumStatus = userGarden.data?.premium_status || false;

      return {
        harvests: harvestRank.data ? { rank: harvestRank.data, premium_status: premiumStatus } : null,
        coins: coinsRank.data ? { rank: coinsRank.data, premium_status: premiumStatus } : null,
        prestige: prestigeRank.data ? { rank: prestigeRank.data, premium_status: premiumStatus } : null,
        level: levelRank.data ? { rank: levelRank.data, premium_status: premiumStatus } : null,
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
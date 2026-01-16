-- Supprimer la vue security definer
DROP VIEW IF EXISTS public.leaderboard_stats;

-- Créer des fonctions RPC pour le classement avec SECURITY DEFINER
-- Ces fonctions ne retournent que les données publiques nécessaires

-- Fonction pour le classement par récoltes
CREATE OR REPLACE FUNCTION public.get_leaderboard_harvests(p_limit integer DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  username text,
  total_harvests integer,
  premium_status boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pg.user_id,
    COALESCE(p.username, 'Jardinier Anonyme') as username,
    pg.total_harvests,
    COALESCE(pg.premium_status, false) as premium_status,
    pg.created_at
  FROM public.player_gardens pg
  LEFT JOIN public.profiles p ON p.id = pg.user_id
  WHERE pg.total_harvests > 0 OR pg.coins > 0 OR pg.level > 1 OR pg.prestige_level > 0
  ORDER BY pg.total_harvests DESC, pg.created_at ASC
  LIMIT p_limit;
$$;

-- Fonction pour le classement par pièces
CREATE OR REPLACE FUNCTION public.get_leaderboard_coins(p_limit integer DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  username text,
  coins bigint,
  premium_status boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pg.user_id,
    COALESCE(p.username, 'Jardinier Anonyme') as username,
    pg.coins,
    COALESCE(pg.premium_status, false) as premium_status,
    pg.created_at
  FROM public.player_gardens pg
  LEFT JOIN public.profiles p ON p.id = pg.user_id
  WHERE pg.total_harvests > 0 OR pg.coins > 0 OR pg.level > 1 OR pg.prestige_level > 0
  ORDER BY pg.coins DESC, pg.created_at ASC
  LIMIT p_limit;
$$;

-- Fonction pour le classement par niveau
CREATE OR REPLACE FUNCTION public.get_leaderboard_level(p_limit integer DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  username text,
  level integer,
  experience integer,
  premium_status boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pg.user_id,
    COALESCE(p.username, 'Jardinier Anonyme') as username,
    COALESCE(pg.level, 1) as level,
    COALESCE(pg.experience, 0) as experience,
    COALESCE(pg.premium_status, false) as premium_status,
    pg.created_at
  FROM public.player_gardens pg
  LEFT JOIN public.profiles p ON p.id = pg.user_id
  WHERE pg.total_harvests > 0 OR pg.coins > 0 OR pg.level > 1 OR pg.prestige_level > 0
  ORDER BY pg.level DESC, pg.experience DESC, pg.created_at ASC
  LIMIT p_limit;
$$;

-- Accorder l'exécution aux utilisateurs authentifiés uniquement
REVOKE ALL ON FUNCTION public.get_leaderboard_harvests(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard_coins(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard_level(integer) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_harvests(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_coins(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_level(integer) TO authenticated;
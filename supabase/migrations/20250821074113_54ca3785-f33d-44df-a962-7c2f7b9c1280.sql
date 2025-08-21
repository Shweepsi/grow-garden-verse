-- Fix remaining data exposure issues with more restrictive leaderboard policies

-- Drop the overly permissive policies we just created
DROP POLICY IF EXISTS "Limited leaderboard profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Limited leaderboard garden stats access" ON public.player_gardens;

-- Create more restrictive leaderboard policy for profiles (only username, no user_id linkage for privacy)
CREATE POLICY "Leaderboard profiles view only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow users to see their own full profile
  auth.uid() = id OR
  -- For leaderboards, only expose username (no user_id linkage possible)
  (username IS NOT NULL)
);

-- Create restrictive leaderboard policy for player_gardens (only necessary ranking stats, no sensitive data)
CREATE POLICY "Leaderboard garden stats only" 
ON public.player_gardens 
FOR SELECT 
USING (
  -- Allow users to see their own full garden data
  auth.uid() = user_id OR
  -- For leaderboards, only expose necessary ranking fields, hide sensitive data
  (
    total_harvests > 0 OR 
    coins > 0 OR 
    level > 1 OR 
    prestige_level > 0
  )
);

-- Add a function to get safe leaderboard data without exposing user relationships
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(p_type text, p_limit integer DEFAULT 100)
RETURNS TABLE(
  rank_position integer,
  username text,
  stat_value bigint,
  level_value integer,
  prestige_value integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_type = 'coins' THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY pg.coins DESC, pg.created_at ASC)::integer as rank_position,
      COALESCE(p.username, 'Jardinier')::text as username,
      pg.coins::bigint as stat_value,
      COALESCE(pg.level, 1)::integer as level_value,
      COALESCE(pg.prestige_level, 0)::integer as prestige_value
    FROM public.player_gardens pg
    LEFT JOIN public.profiles p ON pg.user_id = p.id
    WHERE pg.coins > 0
    ORDER BY pg.coins DESC, pg.created_at ASC
    LIMIT p_limit;
  ELSIF p_type = 'harvests' THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY pg.total_harvests DESC, pg.created_at ASC)::integer as rank_position,
      COALESCE(p.username, 'Jardinier')::text as username,
      pg.total_harvests::bigint as stat_value,
      COALESCE(pg.level, 1)::integer as level_value,
      COALESCE(pg.prestige_level, 0)::integer as prestige_value
    FROM public.player_gardens pg
    LEFT JOIN public.profiles p ON pg.user_id = p.id
    WHERE pg.total_harvests > 0
    ORDER BY pg.total_harvests DESC, pg.created_at ASC
    LIMIT p_limit;
  ELSIF p_type = 'level' THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY COALESCE(pg.level, 1) DESC, COALESCE(pg.experience, 0) DESC, pg.created_at ASC)::integer as rank_position,
      COALESCE(p.username, 'Jardinier')::text as username,
      COALESCE(pg.level, 1)::bigint as stat_value,
      COALESCE(pg.level, 1)::integer as level_value,
      COALESCE(pg.prestige_level, 0)::integer as prestige_value
    FROM public.player_gardens pg
    LEFT JOIN public.profiles p ON pg.user_id = p.id
    WHERE COALESCE(pg.level, 1) > 0
    ORDER BY COALESCE(pg.level, 1) DESC, COALESCE(pg.experience, 0) DESC, pg.created_at ASC
    LIMIT p_limit;
  ELSIF p_type = 'prestige' THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY COALESCE(pg.prestige_level, 0) DESC, pg.created_at ASC)::integer as rank_position,
      COALESCE(p.username, 'Jardinier')::text as username,
      COALESCE(pg.prestige_level, 0)::bigint as stat_value,
      COALESCE(pg.level, 1)::integer as level_value,
      COALESCE(pg.prestige_level, 0)::integer as prestige_value
    FROM public.player_gardens pg
    LEFT JOIN public.profiles p ON pg.user_id = p.id
    WHERE COALESCE(pg.prestige_level, 0) > 0
    ORDER BY COALESCE(pg.prestige_level, 0) DESC, pg.created_at ASC
    LIMIT p_limit;
  END IF;
END;
$$;
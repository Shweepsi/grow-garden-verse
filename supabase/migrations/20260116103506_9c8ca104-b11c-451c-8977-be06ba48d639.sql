-- Supprimer la policy qui expose les profils publiquement
-- La vue leaderboard_stats (security definer) peut toujours accéder aux usernames
DROP POLICY IF EXISTS "Leaderboard profiles view only" ON public.profiles;
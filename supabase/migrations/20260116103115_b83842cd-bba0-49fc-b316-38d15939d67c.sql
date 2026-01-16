-- Supprimer la vue actuelle qui a security_invoker=on
DROP VIEW IF EXISTS public.leaderboard_stats;

-- Recréer la vue SANS security_invoker (comportement par défaut = security_definer)
-- Cela permet à la vue d'accéder aux données pour le classement
-- La vue elle-même agit comme contrôle de sécurité en n'exposant que les colonnes publiques
CREATE VIEW public.leaderboard_stats AS
SELECT 
  pg.user_id,
  pg.total_harvests,
  pg.coins,
  pg.level,
  pg.experience,
  pg.prestige_level,
  pg.premium_status,
  pg.created_at,
  p.username
FROM public.player_gardens pg
LEFT JOIN public.profiles p ON p.id = pg.user_id
WHERE 
  pg.total_harvests > 0 
  OR pg.coins > 0 
  OR pg.level > 1 
  OR pg.prestige_level > 0;

-- Révoquer tous les privilèges par défaut sur la vue
REVOKE ALL ON public.leaderboard_stats FROM anon, authenticated;

-- Accorder uniquement SELECT aux utilisateurs authentifiés
-- Les utilisateurs anonymes ne peuvent pas voir le classement
GRANT SELECT ON public.leaderboard_stats TO authenticated;
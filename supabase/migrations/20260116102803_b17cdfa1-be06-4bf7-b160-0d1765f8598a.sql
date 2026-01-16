-- Créer une vue sécurisée pour le classement qui n'expose que les données nécessaires
-- Cette vue exclut les données financières sensibles (gems, premium_purchased_at, prestige_points, etc.)

CREATE VIEW public.leaderboard_stats
WITH (security_invoker = on) AS
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

-- Supprimer l'ancienne policy de classement qui expose toutes les colonnes
DROP POLICY IF EXISTS "Leaderboard garden stats only" ON public.player_gardens;

-- Recréer la policy pour que les utilisateurs ne puissent voir QUE leurs propres données
-- La vue leaderboard_stats sera utilisée pour le classement public
CREATE POLICY "Users can only view their own garden"
ON public.player_gardens
FOR SELECT
USING (auth.uid() = user_id);
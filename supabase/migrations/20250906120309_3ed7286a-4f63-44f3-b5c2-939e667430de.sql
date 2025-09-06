-- Suppression de la fonction get_user_prestige_rank qui n'est plus utilisée
DROP FUNCTION IF EXISTS public.get_user_prestige_rank(uuid);
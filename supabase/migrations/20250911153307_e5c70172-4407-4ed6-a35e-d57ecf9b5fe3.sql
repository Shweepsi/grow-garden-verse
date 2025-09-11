-- Créer une fonction pour supprimer toutes les données d'un utilisateur
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Supprimer toutes les données liées dans les tables publiques
  DELETE FROM public.active_effects WHERE user_id = target_user_id;
  DELETE FROM public.ad_cooldowns WHERE user_id = target_user_id;
  DELETE FROM public.ad_sessions WHERE user_id = target_user_id;
  DELETE FROM public.coin_transactions WHERE user_id = target_user_id;
  DELETE FROM public.garden_plots WHERE user_id = target_user_id;
  DELETE FROM public.pending_ad_rewards WHERE user_id = target_user_id;
  DELETE FROM public.plant_discoveries WHERE user_id = target_user_id;
  DELETE FROM public.player_gardens WHERE user_id = target_user_id;
  DELETE FROM public.player_upgrades WHERE user_id = target_user_id;
  DELETE FROM public.purchases WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Note: La suppression de auth.users doit être faite via l'API admin
END;
$function$;
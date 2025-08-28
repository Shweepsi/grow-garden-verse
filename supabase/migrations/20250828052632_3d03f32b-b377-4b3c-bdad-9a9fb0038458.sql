-- Fix database function security by adding proper search_path
-- This prevents potential schema confusion attacks

-- Update all database functions to include proper security settings

CREATE OR REPLACE FUNCTION public.get_robot_plant_for_level(robot_level integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Robot level corresponds to plant level_required
  RETURN (
    SELECT id 
    FROM public.plant_types 
    WHERE level_required = robot_level 
    ORDER BY created_at ASC 
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_robot_plant_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update robot_plant_type when robot_level changes
  IF NEW.robot_level != OLD.robot_level AND NEW.robot_level > 0 THEN
    NEW.robot_plant_type = public.get_robot_plant_for_level(NEW.robot_level);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_system_configs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_pending_ad_rewards_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.confirmed_at = CASE WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN now() ELSE NEW.confirmed_at END;
  NEW.revoked_at = CASE WHEN NEW.status = 'revoked' AND OLD.status != 'revoked' THEN now() ELSE NEW.revoked_at END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec 100 pièces de départ et statut premium false
  INSERT INTO public.player_gardens (user_id, coins, premium_status)
  VALUES (new.id, 100, false);
  
  -- Créer les 9 parcelles (première débloquée, autres verrouillées)
  INSERT INTO public.garden_plots (user_id, plot_number, unlocked)
  VALUES 
    (new.id, 1, true),   -- Première parcelle débloquée
    (new.id, 2, false),  -- Autres parcelles verrouillées
    (new.id, 3, false),
    (new.id, 4, false),
    (new.id, 5, false),
    (new.id, 6, false),
    (new.id, 7, false),
    (new.id, 8, false),
    (new.id, 9, false);
  
  RETURN new;
END;
$function$;
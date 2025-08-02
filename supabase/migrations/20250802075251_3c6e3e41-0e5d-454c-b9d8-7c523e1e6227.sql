-- Fix security vulnerabilities in database functions by adding proper search_path
-- This migration secures all existing functions to prevent privilege escalation

-- Update all existing functions to use secure search_path
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

CREATE OR REPLACE FUNCTION public.harvest_plant_transaction(p_user_id uuid, p_plot_number integer, p_new_coins integer, p_new_gems integer, p_new_exp integer, p_new_level integer, p_new_harvests integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update the garden first
  UPDATE public.player_gardens 
  SET 
    coins = p_new_coins,
    gems = p_new_gems,
    experience = p_new_exp,
    level = p_new_level,
    total_harvests = p_new_harvests,
    last_played = NOW()
  WHERE user_id = p_user_id;

  -- Then clear the plot
  UPDATE public.garden_plots 
  SET 
    plant_type = NULL,
    planted_at = NULL,
    growth_time_seconds = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id AND plot_number = p_plot_number;

  -- If either update fails, the entire transaction will be rolled back
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_robot_plant_level(p_robot_level integer, p_plant_type_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  plant_level_required integer;
BEGIN
  -- Get the level required for the plant
  SELECT level_required INTO plant_level_required
  FROM public.plant_types
  WHERE id = p_plant_type_id;
  
  -- Return true if robot level is sufficient
  RETURN COALESCE(plant_level_required, 1) <= p_robot_level;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_plot_unlock_cost(plot_number integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    CASE 
        WHEN plot_number <= 1 THEN RETURN 0;
        WHEN plot_number = 2 THEN RETURN 300;      -- ~10 carrot cycles
        WHEN plot_number = 3 THEN RETURN 800;      -- ~10 lettuce cycles
        WHEN plot_number = 4 THEN RETURN 2200;     -- ~10 tomato cycles
        WHEN plot_number = 5 THEN RETURN 6000;     -- ~10 corn cycles
        WHEN plot_number = 6 THEN RETURN 18000;    -- ~10 potato cycles
        WHEN plot_number = 7 THEN RETURN 50000;    -- ~10 pumpkin cycles
        WHEN plot_number = 8 THEN RETURN 140000;   -- ~10 watermelon cycles
        WHEN plot_number = 9 THEN RETURN 400000;   -- ~10 apple cycles
        ELSE RETURN 1200000;                       -- ~10+ grape cycles
    END CASE;
END;
$function$;
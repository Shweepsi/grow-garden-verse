-- Fix integer overflow when updating coins during harvest by using bigint parameter
-- 1) Drop previous function that used integer for p_new_coins
DROP FUNCTION IF EXISTS public.harvest_plant_transaction(
  uuid, integer, integer, integer, integer, integer, integer
);

-- 2) Re-create with bigint for p_new_coins (coins column is bigint)
CREATE OR REPLACE FUNCTION public.harvest_plant_transaction(
  p_user_id uuid,
  p_plot_number integer,
  p_new_coins bigint,
  p_new_gems integer,
  p_new_exp integer,
  p_new_level integer,
  p_new_harvests integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update the garden atomically
  UPDATE public.player_gardens
  SET 
    coins = p_new_coins,
    gems = p_new_gems,
    experience = p_new_exp,
    level = p_new_level,
    total_harvests = p_new_harvests,
    last_played = NOW()
  WHERE user_id = p_user_id;

  -- Clear the harvested plot
  UPDATE public.garden_plots
  SET 
    plant_type = NULL,
    planted_at = NULL,
    growth_time_seconds = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id AND plot_number = p_plot_number;
END;
$function$;
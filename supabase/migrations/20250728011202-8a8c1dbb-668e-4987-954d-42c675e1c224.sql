-- Create the harvest_plant_transaction function for atomic harvest operations
CREATE OR REPLACE FUNCTION public.harvest_plant_transaction(
  p_user_id uuid,
  p_plot_number integer,
  p_new_coins integer,
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
  -- Update garden in one atomic operation
  UPDATE public.player_gardens
  SET 
    coins = p_new_coins,
    gems = p_new_gems,
    experience = p_new_exp,
    level = p_new_level,
    total_harvests = p_new_harvests,
    last_played = now()
  WHERE user_id = p_user_id;
  
  -- Clear the plot
  UPDATE public.garden_plots
  SET 
    plant_type = null,
    planted_at = null,
    growth_time_seconds = null,
    updated_at = now()
  WHERE user_id = p_user_id AND plot_number = p_plot_number;
  
  -- If either update failed, the transaction will be rolled back
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update garden or plot';
  END IF;
END;
$function$
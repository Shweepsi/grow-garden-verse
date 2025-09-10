-- Phase 3: Améliorer la fonction atomique pour retourner les valeurs calculées
DROP FUNCTION IF EXISTS public.harvest_plant_transaction(uuid, integer, bigint, integer, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.harvest_plant_transaction(
  p_user_id uuid, 
  p_plot_number integer, 
  p_harvest_reward bigint,
  p_exp_reward integer,
  p_gem_reward integer,
  p_growth_time_seconds integer,
  p_multipliers jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_garden_row public.player_gardens%ROWTYPE;
  v_plot_row public.garden_plots%ROWTYPE;
  v_plant_row public.plant_types%ROWTYPE;
  v_new_exp integer;
  v_new_level integer;
  v_new_coins bigint;
  v_new_gems integer;
  v_new_harvests integer;
  v_result json;
BEGIN
  -- Get and lock garden row
  SELECT * INTO v_garden_row
  FROM public.player_gardens
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Garden not found');
  END IF;
  
  -- Get and lock plot row
  SELECT * INTO v_plot_row
  FROM public.garden_plots
  WHERE user_id = p_user_id AND plot_number = p_plot_number
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plot not found');
  END IF;
  
  -- Get plant type
  SELECT * INTO v_plant_row
  FROM public.plant_types
  WHERE id = v_plot_row.plant_type;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plant type not found');
  END IF;
  
  -- Validate plot has plant and is ready
  IF v_plot_row.plant_type IS NULL OR v_plot_row.planted_at IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No plant to harvest');
  END IF;
  
  -- Use the actual growth time from the plot (not base time)
  IF v_plot_row.planted_at + (COALESCE(p_growth_time_seconds, v_plot_row.growth_time_seconds, v_plant_row.base_growth_seconds) || ' seconds')::interval > now() THEN
    RETURN json_build_object('success', false, 'error', 'Plant not ready yet');
  END IF;
  
  -- Calculate final values
  v_new_coins = GREATEST(0, COALESCE(v_garden_row.coins, 0) + p_harvest_reward);
  v_new_gems = GREATEST(0, COALESCE(v_garden_row.gems, 0) + p_gem_reward);
  v_new_exp = GREATEST(0, COALESCE(v_garden_row.experience, 0) + p_exp_reward);
  v_new_level = GREATEST(1, FLOOR(SQRT(v_new_exp / 100.0)) + 1);
  v_new_harvests = GREATEST(0, COALESCE(v_garden_row.total_harvests, 0) + 1);
  
  -- Perform atomic updates
  UPDATE public.player_gardens
  SET 
    coins = v_new_coins,
    gems = v_new_gems,
    experience = v_new_exp,
    level = v_new_level,
    total_harvests = v_new_harvests,
    last_played = now()
  WHERE user_id = p_user_id;
  
  -- Clear the harvested plot
  UPDATE public.garden_plots
  SET 
    plant_type = NULL,
    planted_at = NULL,
    growth_time_seconds = NULL,
    updated_at = now()
  WHERE user_id = p_user_id AND plot_number = p_plot_number;
  
  -- Return exact calculated values for frontend synchronization
  v_result = json_build_object(
    'success', true,
    'final_coins', v_new_coins,
    'final_gems', v_new_gems,
    'final_experience', v_new_exp,
    'final_level', v_new_level,
    'final_harvests', v_new_harvests,
    'harvest_reward', p_harvest_reward,
    'exp_reward', p_exp_reward,
    'gem_reward', p_gem_reward,
    'plant_name', v_plant_row.display_name,
    'old_coins', COALESCE(v_garden_row.coins, 0),
    'old_gems', COALESCE(v_garden_row.gems, 0),
    'old_experience', COALESCE(v_garden_row.experience, 0),
    'old_level', COALESCE(v_garden_row.level, 1)
  );
  
  RETURN v_result;
END;
$function$;
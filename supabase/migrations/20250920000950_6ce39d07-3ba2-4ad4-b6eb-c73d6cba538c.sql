-- Update harvest_plant_transaction to use dynamic gem chance based on player upgrades
CREATE OR REPLACE FUNCTION public.harvest_plant_transaction(p_user_id uuid, p_plot_number integer, p_harvest_reward bigint, p_exp_reward integer, p_gem_reward integer, p_growth_time_seconds integer, p_multipliers jsonb DEFAULT '{}'::jsonb)
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
  v_growth_multiplier numeric := 1;
  v_adjusted_growth_time integer;
  v_planted_time timestamp with time zone;
  v_required_time_ms bigint;
  v_elapsed_ms bigint;
  v_calculated_gem_reward integer := 0;
  
  -- Dynamic gem chance calculation
  v_base_gem_chance constant numeric := 0; -- Start from 0%, add from upgrades
  v_gem_chance_from_upgrades numeric := 0;
  v_gem_boost_multiplier numeric := 1;
  v_final_gem_chance numeric := 0;
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
  
  -- Validate plot has plant
  IF v_plot_row.plant_type IS NULL OR v_plot_row.planted_at IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No plant to harvest');
  END IF;
  
  -- SIMPLIFIED READINESS CHECK
  -- Extract growth multiplier from p_multipliers if provided
  IF p_multipliers IS NOT NULL AND p_multipliers ? 'growth' THEN
    v_growth_multiplier := COALESCE((p_multipliers->>'growth')::numeric, 1);
  END IF;
  
  -- Use plot.growth_time_seconds as source of truth
  v_adjusted_growth_time := FLOOR((COALESCE(v_plot_row.growth_time_seconds, v_plant_row.base_growth_seconds, 60)) / v_growth_multiplier);
  v_adjusted_growth_time := GREATEST(v_adjusted_growth_time, 1);
  
  -- Calculate time requirements
  v_planted_time := v_plot_row.planted_at;
  v_required_time_ms := v_adjusted_growth_time * 1000;
  v_elapsed_ms := EXTRACT(EPOCH FROM (now() - v_planted_time)) * 1000;
  
  -- Check if plant is ready
  IF v_elapsed_ms < v_required_time_ms THEN
    DECLARE
      v_remaining_seconds integer := CEIL((v_required_time_ms - v_elapsed_ms) / 1000);
    BEGIN
      RETURN json_build_object(
        'success', false, 
        'error', 'Plant not ready yet',
        'time_remaining', v_remaining_seconds
      );
    END;
  END IF;
  
  -- DYNAMIC GEM CALCULATION: Calculate gem chance from player upgrades
  -- Get gem_chance bonuses from player upgrades
  SELECT COALESCE(SUM(lu.effect_value), 0) INTO v_gem_chance_from_upgrades
  FROM public.player_upgrades pu
  JOIN public.level_upgrades lu ON pu.upgrade_id = lu.id
  WHERE pu.user_id = p_user_id 
    AND pu.active = true 
    AND lu.effect_type = 'gem_chance';
  
  -- Get gem boost multiplier from temporary effects (passed in multipliers)
  IF p_multipliers IS NOT NULL AND p_multipliers ? 'gems' THEN
    v_gem_boost_multiplier := COALESCE((p_multipliers->>'gems')::numeric, 1);
  END IF;
  
  -- Calculate final gem chance: (base + upgrades) * boost, capped at 100%
  v_final_gem_chance := LEAST(1.0, (v_base_gem_chance + v_gem_chance_from_upgrades) * v_gem_boost_multiplier);
  
  -- Deterministic pseudo-random based on harvest context
  DECLARE
    v_seed integer := (
      EXTRACT(EPOCH FROM v_planted_time)::integer + 
      p_plot_number + 
      LENGTH(v_plant_row.display_name) +
      EXTRACT(DAY FROM now())
    ) % 1000;
    v_pseudo_random numeric := (v_seed * 9301 + 49297) % 233280 / 233280.0;
  BEGIN
    IF v_pseudo_random < v_final_gem_chance THEN
      v_calculated_gem_reward := 1; -- Always 1 gem per successful drop
    END IF;
  END;
  
  -- Calculate final values
  v_new_coins = GREATEST(0, COALESCE(v_garden_row.coins, 0) + p_harvest_reward);
  v_new_gems = GREATEST(0, COALESCE(v_garden_row.gems, 0) + v_calculated_gem_reward);
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
  
  -- Return calculated values for frontend synchronization
  v_result = json_build_object(
    'success', true,
    'final_coins', v_new_coins,
    'final_gems', v_new_gems,
    'final_experience', v_new_exp,
    'final_level', v_new_level,
    'final_harvests', v_new_harvests,
    'harvest_reward', p_harvest_reward,
    'exp_reward', p_exp_reward,
    'gem_reward', v_calculated_gem_reward,
    'plant_name', v_plant_row.display_name,
    'old_coins', COALESCE(v_garden_row.coins, 0),
    'old_gems', COALESCE(v_garden_row.gems, 0),
    'old_experience', COALESCE(v_garden_row.experience, 0),
    'old_level', COALESCE(v_garden_row.level, 1),
    'unified_calculation', true,
    'dynamic_gems', true,
    'gem_chance_used', v_final_gem_chance,
    'gem_chance_from_upgrades', v_gem_chance_from_upgrades,
    'gem_boost_multiplier', v_gem_boost_multiplier
  );
  
  RETURN v_result;
END;
$function$
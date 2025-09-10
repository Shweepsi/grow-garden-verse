-- Create atomic direct planting function
CREATE OR REPLACE FUNCTION public.plant_direct_atomic(
  p_user_id uuid,
  p_plot_number integer,
  p_plant_type_id uuid,
  p_cost_amount bigint,
  p_base_growth_seconds integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_garden_row public.player_gardens%ROWTYPE;
  v_plot_row public.garden_plots%ROWTYPE;
  v_plant_row public.plant_types%ROWTYPE;
  v_now timestamp with time zone := now();
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
  
  -- Get plant type (no lock needed, read-only)
  SELECT * INTO v_plant_row
  FROM public.plant_types
  WHERE id = p_plant_type_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plant type not found');
  END IF;
  
  -- Validate plot is unlocked and empty
  IF NOT v_plot_row.unlocked THEN
    RETURN json_build_object('success', false, 'error', 'Plot not unlocked');
  END IF;
  
  IF v_plot_row.plant_type IS NOT NULL OR v_plot_row.planted_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Plot already occupied');
  END IF;
  
  -- Validate player level
  IF COALESCE(v_garden_row.level, 1) < COALESCE(v_plant_row.level_required, 1) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient level');
  END IF;
  
  -- Validate sufficient coins
  IF v_garden_row.coins < p_cost_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient coins');
  END IF;
  
  -- Perform atomic updates
  -- Update garden (deduct coins)
  UPDATE public.player_gardens
  SET 
    coins = coins - p_cost_amount,
    last_played = v_now
  WHERE user_id = p_user_id;
  
  -- Update plot (plant)
  UPDATE public.garden_plots
  SET 
    plant_type = p_plant_type_id,
    planted_at = v_now,
    growth_time_seconds = p_base_growth_seconds,
    updated_at = v_now
  WHERE user_id = p_user_id AND plot_number = p_plot_number;
  
  -- Record transaction
  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description
  ) VALUES (
    p_user_id,
    -p_cost_amount,
    'plant',
    'Direct planting: ' || v_plant_row.display_name
  );
  
  -- Return success with data
  v_result = json_build_object(
    'success', true,
    'planted_at', v_now,
    'growth_time_seconds', p_base_growth_seconds,
    'new_coin_balance', v_garden_row.coins - p_cost_amount,
    'plant_name', v_plant_row.display_name
  );
  
  RETURN v_result;
END;
$$;
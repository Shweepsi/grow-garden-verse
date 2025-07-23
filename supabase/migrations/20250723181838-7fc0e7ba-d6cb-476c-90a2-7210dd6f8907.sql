-- Corriger toutes les fonctions existantes pour ajouter SET search_path = ''

-- Function: calculate_ad_reward
CREATE OR REPLACE FUNCTION public.calculate_ad_reward(reward_type_param text, player_level_param integer)
RETURNS TABLE(reward_type text, display_name text, description text, emoji text, calculated_amount numeric, duration_minutes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  config_row public.ad_reward_configs%ROWTYPE;
  final_amount NUMERIC;
BEGIN
  -- Récupérer la configuration
  SELECT * INTO config_row 
  FROM public.ad_reward_configs 
  WHERE ad_reward_configs.reward_type = reward_type_param 
    AND active = true 
    AND min_player_level <= player_level_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer le montant final
  final_amount := config_row.base_amount + (config_row.level_coefficient * (player_level_param - 1));
  
  -- Appliquer le maximum si défini
  IF config_row.max_amount IS NOT NULL AND final_amount > config_row.max_amount THEN
    final_amount := config_row.max_amount;
  END IF;
  
  -- Retourner le résultat
  RETURN QUERY SELECT 
    config_row.reward_type,
    config_row.display_name,
    config_row.description,
    config_row.emoji,
    final_amount,
    config_row.duration_minutes;
END;
$$;

-- Function: cleanup_expired_effects
CREATE OR REPLACE FUNCTION public.cleanup_expired_effects()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.active_effects 
  WHERE expires_at IS NOT NULL AND expires_at <= now();
$$;

-- Function: get_active_effects
CREATE OR REPLACE FUNCTION public.get_active_effects(p_user_id uuid)
RETURNS TABLE(id uuid, effect_type text, effect_value numeric, expires_at timestamp with time zone, source text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, effect_type, effect_value, expires_at, source
  FROM public.active_effects 
  WHERE user_id = p_user_id 
    AND expires_at > now()
  ORDER BY created_at DESC;
$$;

-- Function: get_plot_unlock_cost
CREATE OR REPLACE FUNCTION public.get_plot_unlock_cost(plot_number integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
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
$$;

-- Function: get_user_coins_rank
CREATE OR REPLACE FUNCTION public.get_user_coins_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY coins DESC, created_at ASC) as rank_position
    FROM public.player_gardens
    WHERE coins > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Function: get_user_harvest_rank
CREATE OR REPLACE FUNCTION public.get_user_harvest_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_harvests DESC, created_at ASC) as rank_position
    FROM public.player_gardens
    WHERE total_harvests > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Function: get_user_level_rank
CREATE OR REPLACE FUNCTION public.get_user_level_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(level, 1) DESC, COALESCE(experience, 0) DESC, created_at ASC) as rank_position
    FROM public.player_gardens
    WHERE COALESCE(level, 1) > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Function: get_user_prestige_rank
CREATE OR REPLACE FUNCTION public.get_user_prestige_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(prestige_level, 0) DESC, created_at ASC) as rank_position
    FROM public.player_gardens
    WHERE COALESCE(prestige_level, 0) > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Function: validate_robot_plant_level
CREATE OR REPLACE FUNCTION public.validate_robot_plant_level(p_robot_level integer, p_plant_type_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;
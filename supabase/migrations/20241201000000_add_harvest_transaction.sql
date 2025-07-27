-- Create a transaction function for plant harvesting to prevent race conditions
CREATE OR REPLACE FUNCTION harvest_plant_transaction(
  p_user_id UUID,
  p_plot_number INTEGER,
  p_new_coins INTEGER,
  p_new_gems INTEGER,
  p_new_exp INTEGER,
  p_new_level INTEGER,
  p_new_harvests INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Update the garden first
  UPDATE player_gardens 
  SET 
    coins = p_new_coins,
    gems = p_new_gems,
    experience = p_new_exp,
    level = p_new_level,
    total_harvests = p_new_harvests,
    last_played = NOW()
  WHERE user_id = p_user_id;
  
  -- Then clear the plot
  UPDATE garden_plots 
  SET 
    plant_type = NULL,
    planted_at = NULL,
    growth_time_seconds = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id AND plot_number = p_plot_number;
  
  -- If either update fails, the entire transaction will be rolled back
END;
$$ LANGUAGE plpgsql;
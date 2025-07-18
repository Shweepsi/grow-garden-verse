-- Reset all passive robots to potato (level 1 plant) to fix inconsistencies
-- This ensures robot_plant_type matches robot_level for all users

UPDATE public.player_gardens 
SET robot_plant_type = (
  SELECT id FROM public.plant_types 
  WHERE name = 'potato' 
  LIMIT 1
)
WHERE robot_plant_type IS NOT NULL;

-- Add a function to validate robot plant selection
CREATE OR REPLACE FUNCTION public.validate_robot_plant_level(
  p_robot_level integer,
  p_plant_type_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
-- Fix robot level-plant correspondence and add validation function
-- Create a function to get the correct plant for robot level
CREATE OR REPLACE FUNCTION public.get_robot_plant_for_level(robot_level integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Robot level corresponds to plant level_required
  -- Level 1 robot = level 1 plant (potato)
  -- Level 2 robot = level 2 plant (carrot)  
  -- Level 3 robot = level 3 plant (tomato)
  -- etc.
  RETURN (
    SELECT id 
    FROM public.plant_types 
    WHERE level_required = robot_level 
    ORDER BY created_at ASC 
    LIMIT 1
  );
END;
$$;

-- Update robot_plant_type to match robot_level for all existing players
UPDATE public.player_gardens 
SET robot_plant_type = public.get_robot_plant_for_level(robot_level)
WHERE robot_level > 0;

-- Create function to auto-sync robot plant type when robot level changes
CREATE OR REPLACE FUNCTION public.sync_robot_plant_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update robot_plant_type when robot_level changes
  IF NEW.robot_level != OLD.robot_level AND NEW.robot_level > 0 THEN
    NEW.robot_plant_type = public.get_robot_plant_for_level(NEW.robot_level);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync robot plant type
DROP TRIGGER IF EXISTS sync_robot_plant_type_trigger ON public.player_gardens;
CREATE TRIGGER sync_robot_plant_type_trigger
  BEFORE UPDATE ON public.player_gardens
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_robot_plant_type();
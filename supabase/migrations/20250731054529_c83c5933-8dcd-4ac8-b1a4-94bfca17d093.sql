-- Fix the search_path issue by updating existing functions
CREATE OR REPLACE FUNCTION public.get_robot_plant_for_level(robot_level integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Robot level corresponds to plant level_required
  RETURN (
    SELECT id 
    FROM plant_types 
    WHERE level_required = robot_level 
    ORDER BY created_at ASC 
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_robot_plant_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update robot_plant_type when robot_level changes
  IF NEW.robot_level != OLD.robot_level AND NEW.robot_level > 0 THEN
    NEW.robot_plant_type = get_robot_plant_for_level(NEW.robot_level);
  END IF;
  
  RETURN NEW;
END;
$$;
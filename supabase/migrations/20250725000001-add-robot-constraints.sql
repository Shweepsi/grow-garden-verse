-- Ajouter des contraintes et triggers pour maintenir la cohérence du système de robot

-- Contrainte pour s'assurer que l'accumulation ne dépasse pas 24h de production
ALTER TABLE player_gardens
ADD CONSTRAINT check_robot_accumulation 
CHECK (robot_accumulated_coins >= 0);

-- Fonction pour valider et corriger l'accumulation du robot
CREATE OR REPLACE FUNCTION validate_robot_accumulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_accumulation integer;
  v_coins_per_minute integer;
BEGIN
  -- Si pas de robot actif, réinitialiser les valeurs
  IF NEW.robot_plant_type IS NULL THEN
    NEW.robot_accumulated_coins := 0;
    NEW.robot_last_collected := NOW();
    RETURN NEW;
  END IF;
  
  -- Calculer le revenu par minute basé sur le niveau du robot
  -- Base: 50 + (niveau * 60) = 110 pour niveau 1, 650 pour niveau 10
  v_coins_per_minute := 50 + (NEW.robot_level * 60);
  
  -- Maximum 24h d'accumulation
  v_max_accumulation := v_coins_per_minute * 24 * 60;
  
  -- S'assurer que l'accumulation ne dépasse pas le maximum
  IF NEW.robot_accumulated_coins > v_max_accumulation THEN
    NEW.robot_accumulated_coins := v_max_accumulation;
  END IF;
  
  -- S'assurer que l'accumulation n'est pas négative
  IF NEW.robot_accumulated_coins < 0 THEN
    NEW.robot_accumulated_coins := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour valider l'accumulation avant chaque mise à jour
CREATE TRIGGER validate_robot_accumulation_trigger
BEFORE INSERT OR UPDATE OF robot_accumulated_coins, robot_level, robot_plant_type
ON player_gardens
FOR EACH ROW
EXECUTE FUNCTION validate_robot_accumulation();

-- Fonction pour synchroniser le robot_plant_type avec le robot_level
CREATE OR REPLACE FUNCTION sync_robot_plant_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le niveau du robot change, mettre à jour la plante correspondante
  IF NEW.robot_level != OLD.robot_level OR NEW.robot_level IS DISTINCT FROM OLD.robot_level THEN
    SELECT id INTO NEW.robot_plant_type
    FROM plant_types
    WHERE level_required = NEW.robot_level
    ORDER BY created_at
    LIMIT 1;
    
    -- Réinitialiser l'accumulation lors d'un changement de niveau
    NEW.robot_accumulated_coins := 0;
    NEW.robot_last_collected := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour synchroniser automatiquement la plante avec le niveau
CREATE TRIGGER sync_robot_plant_type_trigger
BEFORE UPDATE OF robot_level
ON player_gardens
FOR EACH ROW
EXECUTE FUNCTION sync_robot_plant_type();

-- Corriger les données existantes
UPDATE player_gardens pg
SET 
  robot_plant_type = (
    SELECT id 
    FROM plant_types pt 
    WHERE pt.level_required = pg.robot_level
    ORDER BY created_at
    LIMIT 1
  )
WHERE robot_plant_type IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM plant_types pt 
    WHERE pt.id = pg.robot_plant_type 
      AND pt.level_required = pg.robot_level
  );
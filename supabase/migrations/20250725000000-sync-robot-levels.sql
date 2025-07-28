-- Synchroniser les niveaux de robot avec les améliorations actuelles des joueurs
-- Cette migration corrige l'incohérence entre robot_level stocké et les améliorations actives

-- Fonction pour calculer le niveau de robot basé sur les améliorations
CREATE OR REPLACE FUNCTION calculate_robot_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_robot_level integer;
BEGIN
  -- Récupérer le niveau de robot maximum depuis les améliorations actives
  SELECT COALESCE(MAX(FLOOR(lu.effect_value)), 1)
  INTO v_robot_level
  FROM player_upgrades pu
  JOIN level_upgrades lu ON pu.upgrade_id = lu.id
  WHERE pu.user_id = p_user_id
    AND pu.active = true
    AND lu.effect_type = 'robot_level';
  
  -- Si pas d'amélioration robot_level, vérifier si auto_harvest est actif (niveau 1)
  IF v_robot_level IS NULL THEN
    SELECT CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM player_upgrades pu
        JOIN level_upgrades lu ON pu.upgrade_id = lu.id
        WHERE pu.user_id = p_user_id
          AND pu.active = true
          AND lu.effect_type = 'auto_harvest'
      ) THEN 1
      ELSE 1
    END INTO v_robot_level;
  END IF;
  
  RETURN v_robot_level;
END;
$$;

-- Mettre à jour tous les niveaux de robot pour correspondre aux améliorations
UPDATE player_gardens pg
SET 
  robot_level = calculate_robot_level(pg.user_id),
  robot_plant_type = (
    SELECT pt.id 
    FROM plant_types pt 
    WHERE pt.level_required = calculate_robot_level(pg.user_id)
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 
  FROM player_upgrades pu
  JOIN level_upgrades lu ON pu.upgrade_id = lu.id
  WHERE pu.user_id = pg.user_id
    AND pu.active = true
    AND lu.effect_type IN ('auto_harvest', 'robot_level')
);

-- Réinitialiser l'accumulation pour les robots qui ont changé de niveau
UPDATE player_gardens
SET 
  robot_accumulated_coins = 0,
  robot_last_collected = NOW()
WHERE robot_level != (SELECT calculate_robot_level(user_id));

-- Nettoyer la fonction temporaire
DROP FUNCTION calculate_robot_level(uuid);
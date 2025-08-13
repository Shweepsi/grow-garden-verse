-- Ajouter robot_level dans player_gardens
ALTER TABLE public.player_gardens 
ADD COLUMN robot_level integer DEFAULT 1 NOT NULL;

-- Créer les améliorations pour les niveaux de robot (niveaux 2-10)
INSERT INTO public.level_upgrades (
  name, 
  display_name, 
  description, 
  level_required, 
  cost_coins, 
  cost_gems, 
  effect_type, 
  effect_value, 
  emoji
) VALUES 
  ('robot_level_2', 'Robot Niveau 2', 'Débloque la carotte pour le robot passif', 5, 1000, 0, 'robot_level', 2, '🤖'),
  ('robot_level_3', 'Robot Niveau 3', 'Débloque la laitue pour le robot passif', 8, 2500, 0, 'robot_level', 3, '🤖'),
  ('robot_level_4', 'Robot Niveau 4', 'Débloque la tomate pour le robot passif', 12, 5000, 0, 'robot_level', 4, '🤖'),
  ('robot_level_5', 'Robot Niveau 5', 'Débloque le maïs pour le robot passif', 16, 10000, 0, 'robot_level', 5, '🤖'),
  ('robot_level_6', 'Robot Niveau 6', 'Débloque la citrouille pour le robot passif', 20, 20000, 0, 'robot_level', 6, '🤖'),
  ('robot_level_7', 'Robot Niveau 7', 'Débloque la pastèque pour le robot passif', 25, 40000, 0, 'robot_level', 7, '🤖'),
  ('robot_level_8', 'Robot Niveau 8', 'Débloque la pomme pour le robot passif', 30, 80000, 0, 'robot_level', 8, '🤖'),
  ('robot_level_9', 'Robot Niveau 9', 'Débloque le raisin pour le robot passif', 35, 150000, 0, 'robot_level', 9, '🤖'),
  ('robot_level_10', 'Robot Niveau 10', 'Débloque la fraise pour le robot passif', 40, 300000, 30, 'robot_level', 10, '🤖');
/*
  # Fonctions pour les classements

  1. Nouvelles fonctions
    - `get_user_harvest_rank` - Obtenir le rang d'un utilisateur par récoltes
    - `get_user_coins_rank` - Obtenir le rang d'un utilisateur par pièces  
    - `get_user_prestige_rank` - Obtenir le rang d'un utilisateur par prestige
    - `get_user_level_rank` - Obtenir le rang d'un utilisateur par niveau

  2. Sécurité
    - Fonctions publiques pour les classements
    - Optimisées pour les performances
*/

-- Fonction pour obtenir le rang d'un utilisateur par récoltes totales
CREATE OR REPLACE FUNCTION get_user_harvest_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_harvests DESC) as rank_position
    FROM player_gardens
    WHERE total_harvests > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Fonction pour obtenir le rang d'un utilisateur par pièces
CREATE OR REPLACE FUNCTION get_user_coins_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY coins DESC) as rank_position
    FROM player_gardens
    WHERE coins > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Fonction pour obtenir le rang d'un utilisateur par niveau de prestige
CREATE OR REPLACE FUNCTION get_user_prestige_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(prestige_level, 0) DESC) as rank_position
    FROM player_gardens
    WHERE COALESCE(prestige_level, 0) > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;

-- Fonction pour obtenir le rang d'un utilisateur par niveau
CREATE OR REPLACE FUNCTION get_user_level_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT rank_position INTO user_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(level, 1) DESC, COALESCE(experience, 0) DESC) as rank_position
    FROM player_gardens
    WHERE COALESCE(level, 1) > 0
  ) ranked
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$;
-- Fix robot initialization for new users and existing accounts
-- 1. Update handle_new_user function to set robot_last_collected to NULL initially
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec 100 pièces de départ et robot_last_collected NULL
  INSERT INTO public.player_gardens (user_id, coins, premium_status, robot_last_collected)
  VALUES (new.id, 100, false, NULL);
  
  -- Créer les 9 parcelles (première débloquée, autres verrouillées)
  INSERT INTO public.garden_plots (user_id, plot_number, unlocked)
  VALUES 
    (new.id, 1, true),   -- Première parcelle débloquée
    (new.id, 2, false),  -- Autres parcelles verrouillées
    (new.id, 3, false),
    (new.id, 4, false),
    (new.id, 5, false),
    (new.id, 6, false),
    (new.id, 7, false),
    (new.id, 8, false),
    (new.id, 9, false);
  
  RETURN new;
END;
$$;

-- 2. Fix existing accounts with robot_level = 0 by resetting their robot state
UPDATE public.player_gardens 
SET 
  robot_last_collected = NULL,
  robot_accumulated_coins = 0
WHERE robot_level = 0;

-- Ajouter les parcelles 5-9 pour tous les utilisateurs existants
INSERT INTO public.garden_plots (user_id, plot_number, unlocked)
SELECT user_id, 5, false FROM public.garden_plots WHERE plot_number = 1
UNION ALL
SELECT user_id, 6, false FROM public.garden_plots WHERE plot_number = 1
UNION ALL
SELECT user_id, 7, false FROM public.garden_plots WHERE plot_number = 1
UNION ALL
SELECT user_id, 8, false FROM public.garden_plots WHERE plot_number = 1
UNION ALL
SELECT user_id, 9, false FROM public.garden_plots WHERE plot_number = 1;

-- Mettre à jour la fonction handle_new_user pour créer 9 parcelles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec 50 pièces de départ
  INSERT INTO public.player_gardens (user_id, coins)
  VALUES (new.id, 50);
  
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
$function$

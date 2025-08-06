-- Ajouter les colonnes premium au système
ALTER TABLE public.player_gardens 
ADD COLUMN premium_status boolean DEFAULT false,
ADD COLUMN premium_purchased_at timestamp with time zone;

-- Ajouter un index pour optimiser les requêtes premium
CREATE INDEX idx_player_gardens_premium_status ON public.player_gardens(premium_status);

-- Mettre à jour la fonction de trigger pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec 100 pièces de départ et statut premium false
  INSERT INTO public.player_gardens (user_id, coins, premium_status)
  VALUES (new.id, 100, false);
  
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
$function$;
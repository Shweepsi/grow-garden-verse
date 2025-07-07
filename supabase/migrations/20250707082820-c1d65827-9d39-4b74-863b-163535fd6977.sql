-- Créer la relation foreign key entre player_gardens et profiles
-- pour permettre les jointures dans les classements

-- D'abord, s'assurer que tous les user_id dans player_gardens existent dans profiles
-- (normalement c'est déjà le cas grâce au trigger handle_new_user)

-- Ajouter la contrainte foreign key
ALTER TABLE public.player_gardens 
ADD CONSTRAINT player_gardens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Créer un index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_player_gardens_user_id ON public.player_gardens(user_id);

-- Permettre les politiques RLS sur profiles pour les lectures publiques des classements
CREATE POLICY "Public profiles are viewable for leaderboards" 
ON public.profiles 
FOR SELECT 
USING (true);
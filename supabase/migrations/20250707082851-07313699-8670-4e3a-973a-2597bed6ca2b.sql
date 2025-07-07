-- Permettre la lecture publique des profils pour les classements
CREATE POLICY "Public profiles are viewable for leaderboards" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Créer un index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_player_gardens_user_id ON public.player_gardens(user_id);
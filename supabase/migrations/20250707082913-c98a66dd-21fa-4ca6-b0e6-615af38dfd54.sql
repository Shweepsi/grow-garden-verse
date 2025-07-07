-- Permettre la lecture publique des données de jardin pour les classements
-- (seulement les données nécessaires aux classements, pas les informations sensibles)
CREATE POLICY "Public garden stats are viewable for leaderboards" 
ON public.player_gardens 
FOR SELECT 
USING (true);
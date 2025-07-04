-- Ajouter une politique RLS pour permettre aux utilisateurs de mettre à jour leurs propres améliorations
CREATE POLICY "Users can update their own upgrades" 
ON public.player_upgrades 
FOR UPDATE 
USING (auth.uid() = user_id);
-- Ajouter une colonne active pour gérer l'état des améliorations
ALTER TABLE public.player_upgrades 
ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Créer un index pour optimiser les requêtes
CREATE INDEX idx_player_upgrades_active ON public.player_upgrades(user_id, active);
-- Migration pour ajouter le multiplicateur X2 pièces global de l'Early Access Pack

-- Créer la table des avantages utilisateur
CREATE TABLE public.user_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  perk_type TEXT NOT NULL,
  perk_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  multiplier_value DECIMAL DEFAULT 1.0,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activer RLS pour la sécurité
ALTER TABLE public.user_perks ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres avantages
CREATE POLICY "Users can view their own perks" 
  ON public.user_perks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Index pour optimiser les requêtes
CREATE INDEX idx_user_perks_user_id ON public.user_perks(user_id);
CREATE INDEX idx_user_perks_type_active ON public.user_perks(perk_type, is_active);

-- Ajouter une colonne early_access_multiplier à la table player_gardens
ALTER TABLE public.player_gardens 
ADD COLUMN early_access_multiplier DECIMAL DEFAULT 1.0;

-- Fonction pour calculer le multiplicateur Early Access d'un utilisateur
CREATE OR REPLACE FUNCTION get_early_access_multiplier(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  multiplier_value DECIMAL := 1.0;
BEGIN
  -- Chercher le multiplicateur Early Access actif
  SELECT COALESCE(up.multiplier_value, 1.0) INTO multiplier_value
  FROM user_perks up
  WHERE up.user_id = p_user_id 
    AND up.perk_type = 'early_access_coins_multiplier'
    AND up.is_active = true
  LIMIT 1;
  
  RETURN multiplier_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer la table pour configurer les récompenses publicitaires
CREATE TABLE public.ad_reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_type TEXT NOT NULL UNIQUE, -- 'coins', 'gems', 'growth_boost', 'coin_boost', 'gem_boost'
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT,
  base_amount NUMERIC NOT NULL, -- Montant de base
  level_coefficient NUMERIC DEFAULT 1.0, -- Multiplicateur par niveau
  max_amount NUMERIC, -- Montant maximum (optionnel)
  min_player_level INTEGER DEFAULT 1, -- Niveau minimum requis
  active BOOLEAN DEFAULT TRUE,
  duration_minutes INTEGER, -- Pour les boosts temporaires
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.ad_reward_configs ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture des configurations (publiques)
CREATE POLICY "Anyone can view ad reward configs" 
  ON public.ad_reward_configs 
  FOR SELECT 
  USING (active = true);

-- Insérer les configurations par défaut
INSERT INTO public.ad_reward_configs (
  reward_type, 
  display_name, 
  description, 
  emoji, 
  base_amount, 
  level_coefficient, 
  max_amount, 
  min_player_level, 
  duration_minutes
) VALUES 
  ('coins', 'Pièces', 'Gagnez des pièces', '🪙', 1000, 800, 50000, 1, NULL),
  ('gems', 'Gemmes', 'Gagnez des gemmes', '💎', 1, 1, 100, 1, NULL),
  ('coin_boost', 'Boost Pièces', 'Boost pièces x2', '💰', 2.0, 0, 2.0, 1, 60),
  ('gem_boost', 'Boost Gemmes', 'Boost gemmes x1.5', '✨', 1.5, 0, 1.5, 1, 30),
  ('growth_boost', 'Croissance Rapide', 'Réduction temps de croissance', '🌱', 0.5, -0.08, 0.2, 1, 30);

-- Fonction pour calculer la récompense basée sur le niveau
CREATE OR REPLACE FUNCTION public.calculate_ad_reward(
  reward_type_param TEXT,
  player_level_param INTEGER
)
RETURNS TABLE (
  reward_type TEXT,
  display_name TEXT,
  description TEXT,
  emoji TEXT,
  calculated_amount NUMERIC,
  duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_row public.ad_reward_configs%ROWTYPE;
  final_amount NUMERIC;
BEGIN
  -- Récupérer la configuration
  SELECT * INTO config_row 
  FROM public.ad_reward_configs 
  WHERE ad_reward_configs.reward_type = reward_type_param 
    AND active = true 
    AND min_player_level <= player_level_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer le montant final
  final_amount := config_row.base_amount + (config_row.level_coefficient * (player_level_param - 1));
  
  -- Appliquer le maximum si défini
  IF config_row.max_amount IS NOT NULL AND final_amount > config_row.max_amount THEN
    final_amount := config_row.max_amount;
  END IF;
  
  -- Retourner le résultat
  RETURN QUERY SELECT 
    config_row.reward_type,
    config_row.display_name,
    config_row.description,
    config_row.emoji,
    final_amount,
    config_row.duration_minutes;
END;
$$;

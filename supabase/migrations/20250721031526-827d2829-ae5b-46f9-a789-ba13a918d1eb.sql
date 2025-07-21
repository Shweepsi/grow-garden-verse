-- Créer la table pour les effets temporaires actifs
CREATE TABLE IF NOT EXISTS public.active_effects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  effect_type TEXT NOT NULL, -- 'coin_boost', 'gem_boost', 'growth_boost'
  effect_value NUMERIC NOT NULL DEFAULT 1.0, -- multiplier ou pourcentage
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'ad_reward' -- source de l'effet
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_active_effects_user_id ON public.active_effects(user_id);
CREATE INDEX IF NOT EXISTS idx_active_effects_expires_at ON public.active_effects(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_effects_user_type ON public.active_effects(user_id, effect_type);

-- RLS policies
ALTER TABLE public.active_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active effects"
  ON public.active_effects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active effects"
  ON public.active_effects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active effects"
  ON public.active_effects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active effects"
  ON public.active_effects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour récupérer les effets actifs d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_active_effects(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  effect_type TEXT,
  effect_value NUMERIC,
  expires_at TIMESTAMP WITH TIME ZONE,
  source TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, effect_type, effect_value, expires_at, source
  FROM public.active_effects 
  WHERE user_id = p_user_id 
    AND expires_at > now()
  ORDER BY created_at DESC;
$$;

-- Mettre à jour la table ad_cooldowns pour supporter le cooldown fixe de 2h
ALTER TABLE public.ad_cooldowns 
ADD COLUMN IF NOT EXISTS fixed_cooldown_duration INTEGER DEFAULT 7200; -- 2 heures en secondes
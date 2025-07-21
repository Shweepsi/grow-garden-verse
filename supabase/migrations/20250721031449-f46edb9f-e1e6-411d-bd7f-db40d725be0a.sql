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
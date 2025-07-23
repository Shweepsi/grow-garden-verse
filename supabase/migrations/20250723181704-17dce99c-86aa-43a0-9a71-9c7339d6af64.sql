-- Fonction atomique pour incrémenter le compteur de publicités de façon thread-safe
CREATE OR REPLACE FUNCTION public.increment_ad_count_atomic(
  p_user_id UUID,
  p_today DATE,
  p_now TIMESTAMP WITH TIME ZONE,
  p_max_ads INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER := 0;
  new_count INTEGER := 1;
  result JSON;
BEGIN
  -- Faire l'UPSERT atomique qui gère création ET incrémentation
  INSERT INTO public.ad_cooldowns (
    user_id,
    daily_count, 
    daily_reset_date,
    last_ad_watched,
    updated_at
  )
  VALUES (
    p_user_id,
    1,
    p_today,
    p_now,
    p_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    daily_count = CASE 
      WHEN ad_cooldowns.daily_reset_date < p_today THEN 1  -- Nouveau jour, reset à 1
      ELSE ad_cooldowns.daily_count + 1                    -- Même jour, incrémenter
    END,
    daily_reset_date = p_today,
    last_ad_watched = p_now,
    updated_at = p_now
  RETURNING daily_count INTO new_count;

  -- Vérifier si on a dépassé la limite
  IF new_count > p_max_ads THEN
    -- Revenir en arrière (rollback de l'incrémentation)
    UPDATE public.ad_cooldowns 
    SET daily_count = daily_count - 1,
        updated_at = p_now
    WHERE user_id = p_user_id;
    
    result = json_build_object(
      'success', false,
      'current_count', new_count - 1,
      'new_count', new_count - 1,
      'message', 'Daily ad limit exceeded'
    );
  ELSE
    result = json_build_object(
      'success', true,
      'current_count', new_count - 1,
      'new_count', new_count,
      'message', 'Ad count incremented successfully'
    );
  END IF;

  RETURN result;
END;
$$;
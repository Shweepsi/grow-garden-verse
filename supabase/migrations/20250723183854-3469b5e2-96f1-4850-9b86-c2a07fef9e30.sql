-- Fix security warning: add SET search_path = '' to the new function
CREATE OR REPLACE FUNCTION public.update_pending_ad_rewards_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.confirmed_at = CASE WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN now() ELSE NEW.confirmed_at END;
  NEW.revoked_at = CASE WHEN NEW.status = 'revoked' AND OLD.status != 'revoked' THEN now() ELSE NEW.revoked_at END;
  RETURN NEW;
END;
$$;
-- Migration to standardise growth boost naming (growth_boost -> growth_speed)
-- ---------------------------------------------------------------
-- This keeps database values consistent with the client / server code
-- which now uses the single identifier 'growth_speed'.
-- ---------------------------------------------------------------

-- 1. Update ad_reward_configs (reward selection)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ad_reward_configs WHERE reward_type = 'growth_boost'
  ) THEN
    -- If the target value already exists, delete the legacy row to avoid UNIQUE violation
    IF EXISTS (
      SELECT 1 FROM public.ad_reward_configs WHERE reward_type = 'growth_speed'
    ) THEN
      DELETE FROM public.ad_reward_configs WHERE reward_type = 'growth_boost';
    ELSE
      UPDATE public.ad_reward_configs SET reward_type = 'growth_speed'
      WHERE reward_type = 'growth_boost';
    END IF;
  END IF;
END $$;

-- 2. Update active_effects (currently active boosts)
UPDATE public.active_effects
SET effect_type = 'growth_speed'
WHERE effect_type = 'growth_boost';

-- 3. Update pending_ad_rewards (rewards awaiting confirmation)
UPDATE public.pending_ad_rewards
SET reward_type = 'growth_speed'
WHERE reward_type = 'growth_boost';

-- 4. Optionally, update any historical logs or additional tables here
-- (add similar UPDATE statements if required)

-- 5. Add comment to clarify allowed effect types
COMMENT ON COLUMN public.active_effects.effect_type IS 'Type of temporary effect (coin_boost, gem_boost, growth_speed)';
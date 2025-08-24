-- Désactiver les récompenses coins et gems dans ad_reward_configs
UPDATE public.ad_reward_configs 
SET active = false 
WHERE reward_type IN ('coins', 'gems');
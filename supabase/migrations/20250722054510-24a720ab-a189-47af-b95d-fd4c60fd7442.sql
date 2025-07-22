-- Modifier la configuration du boost de croissance pour x2 vitesse
UPDATE public.ad_reward_configs 
SET 
  base_amount = 0.5,
  level_coefficient = 0,
  max_amount = 0.5,
  description = 'Boost croissance x2 (temps divisé par 2)'
WHERE reward_type = 'growth_boost';
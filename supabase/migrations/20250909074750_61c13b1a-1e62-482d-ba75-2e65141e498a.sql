-- Rebalance gem_chance upgrades to compensate for removed multipliers
-- Increase base percentages since we no longer have rarity multipliers

UPDATE level_upgrades 
SET effect_value = 0.15
WHERE effect_type = 'gem_chance' AND level_required = 5;

UPDATE level_upgrades 
SET effect_value = 0.25
WHERE effect_type = 'gem_chance' AND level_required = 10;
-- Ajouter les améliorations de prestige dans la table level_upgrades
INSERT INTO public.level_upgrades (
  name,
  display_name,
  description,
  level_required,
  cost_coins,
  cost_gems,
  effect_type,
  effect_value,
  emoji
) VALUES 
(
  'prestige_1',
  'Prestige I',
  'Remet votre progression à zéro mais octroie un multiplicateur permanent X2 sur tous les gains',
  10,
  100000,
  50,
  'prestige',
  2.0,
  '👑'
),
(
  'prestige_2', 
  'Prestige II',
  'Remet votre progression à zéro mais octroie un multiplicateur permanent X5 sur tous les gains',
  20,
  500000,
  200,
  'prestige',
  5.0,
  '⭐'
),
(
  'prestige_3',
  'Prestige III',
  'Remet votre progression à zéro mais octroie un multiplicateur permanent X10 sur tous les gains',
  30,
  2000000,
  500,
  'prestige',
  10.0,
  '💎'
);
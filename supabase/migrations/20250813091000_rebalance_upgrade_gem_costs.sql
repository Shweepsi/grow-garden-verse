-- Migration pour rééquilibrer l'économie en ajoutant des coûts en gemmes
-- à certaines améliorations stratégiques.

-- L'auto_harvest est une amélioration de confort majeure, justifiant un coût élevé.
UPDATE public.level_upgrades
SET
  cost_coins = 500000,
  cost_gems = 50
WHERE name = 'auto_harvest';

-- L'amélioration de plus haut niveau pour trouver des gemmes devrait elle-même coûter des gemmes.
UPDATE public.level_upgrades
SET
  cost_gems = 25
WHERE name = 'gem_finder_2';

-- L'amélioration finale du robot est une étape importante de fin de jeu.
UPDATE public.level_upgrades
SET
  cost_gems = 30
WHERE name = 'robot_level_10';

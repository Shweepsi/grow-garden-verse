
-- Supprimer les améliorations de déblocage de raretés (obsolètes)
DELETE FROM level_upgrades 
WHERE effect_type IN ('unlock_rare', 'unlock_epic', 'unlock_legendary', 'unlock_mythic');

-- Rembourser les joueurs qui avaient acheté ces améliorations
-- (on ajoute 50% de remboursement en pièces)
INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
SELECT 
    pu.user_id,
    COALESCE(lu.cost_coins * 0.5, 0)::integer as refund_amount,
    'refund' as transaction_type,
    'Remboursement amélioration supprimée: ' || lu.display_name as description
FROM player_upgrades pu
JOIN level_upgrades lu ON pu.upgrade_id = lu.id
WHERE lu.effect_type IN ('unlock_rare', 'unlock_epic', 'unlock_legendary', 'unlock_mythic');

-- Mettre à jour les soldes des joueurs
UPDATE player_gardens 
SET coins = coins + (
    SELECT COALESCE(SUM(lu.cost_coins * 0.5), 0)::integer
    FROM player_upgrades pu
    JOIN level_upgrades lu ON pu.upgrade_id = lu.id
    WHERE pu.user_id = player_gardens.user_id
    AND lu.effect_type IN ('unlock_rare', 'unlock_epic', 'unlock_legendary', 'unlock_mythic')
);

-- Supprimer les achats d'améliorations obsolètes
DELETE FROM player_upgrades 
WHERE upgrade_id IN (
    SELECT id FROM level_upgrades 
    WHERE effect_type IN ('unlock_rare', 'unlock_epic', 'unlock_legendary', 'unlock_mythic')
);

-- Mettre à jour les coûts des améliorations existantes (sans gemmes)
UPDATE level_upgrades SET 
    cost_gems = 0,
    cost_coins = CASE 
        WHEN level_required <= 3 THEN 1000
        WHEN level_required <= 8 THEN 2500  
        WHEN level_required <= 15 THEN 6000
        WHEN level_required <= 25 THEN 15000
        ELSE 40000
    END
WHERE effect_type IN ('harvest_multiplier', 'growth_speed', 'auto_harvest', 'prestige_unlock');

-- Ajouter de nouvelles améliorations utiles
INSERT INTO level_upgrades (name, display_name, description, level_required, cost_coins, cost_gems, effect_type, effect_value, emoji) VALUES
('auto_plot_unlock_1', 'Déblocage Auto I', 'Débloque automatiquement la parcelle 2 au niveau 5', 5, 2500, 0, 'auto_unlock', 2, '🔓'),
('auto_plot_unlock_2', 'Déblocage Auto II', 'Débloque automatiquement la parcelle 3 au niveau 10', 10, 6000, 0, 'auto_unlock', 3, '🔓'),
('auto_plot_unlock_3', 'Déblocage Auto III', 'Débloque automatiquement la parcelle 4 au niveau 15', 15, 15000, 0, 'auto_unlock', 4, '🔓'),
('exp_bonus_1', 'Sage Jardinier I', 'Bonus de 25% d''expérience sur toutes les récoltes', 8, 4000, 0, 'exp_multiplier', 1.25, '📚'),
('exp_bonus_2', 'Sage Jardinier II', 'Bonus de 50% d''expérience sur toutes les récoltes', 18, 25000, 0, 'exp_multiplier', 1.5, '🎓'),
('plant_cost_reduction_1', 'Économe I', 'Réduction de 10% du coût des plantations', 12, 8000, 0, 'plant_cost_reduction', 0.9, '💰'),
('plant_cost_reduction_2', 'Économe II', 'Réduction de 20% du coût des plantations', 22, 35000, 0, 'plant_cost_reduction', 0.8, '💎'),
('gem_finder_1', 'Chercheur de Gemmes I', 'Petite chance de trouver des gemmes en récoltant', 15, 12000, 0, 'gem_chance', 0.05, '💎'),
('gem_finder_2', 'Chercheur de Gemmes II', 'Chance moyenne de trouver des gemmes en récoltant', 25, 50000, 25, 'gem_chance', 0.1, '💍');

-- Réajustement du coût de l'auto_harvest pour inclure les gemmes
UPDATE public.level_upgrades
SET
  cost_coins = 500000,
  cost_gems = 50
WHERE name = 'auto_harvest';

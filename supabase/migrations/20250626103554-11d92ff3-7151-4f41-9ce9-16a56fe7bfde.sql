
-- D'abord, vider toutes les parcelles plantées
UPDATE garden_plots SET plant_type = NULL, planted_at = NULL, growth_time_minutes = NULL WHERE plant_type IS NOT NULL;

-- Maintenant supprimer toutes les plantes existantes
DELETE FROM plant_types;

-- Créer exactement 10 plantes avec progression logique
INSERT INTO plant_types (name, display_name, emoji, level_required, base_growth_minutes, rarity) VALUES
('carrot', 'Carotte', '🥕', 1, 1, 'common'),
('lettuce', 'Laitue', '🥬', 2, 3, 'common'),
('tomato', 'Tomate', '🍅', 3, 5, 'common'),
('corn', 'Maïs', '🌽', 4, 8, 'common'),
('potato', 'Pomme de terre', '🥔', 5, 12, 'common'),
('pumpkin', 'Citrouille', '🎃', 6, 16, 'common'),
('watermelon', 'Pastèque', '🍉', 7, 20, 'common'),
('apple', 'Pomme', '🍎', 8, 25, 'common'),
('grape', 'Raisin', '🍇', 9, 30, 'common'),
('golden_fruit', 'Fruit doré', '🍊', 10, 35, 'common');

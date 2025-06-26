
-- Étape 1: Ajouter les nouvelles colonnes en secondes
ALTER TABLE plant_types ADD COLUMN base_growth_seconds INTEGER;
ALTER TABLE garden_plots ADD COLUMN growth_time_seconds INTEGER;

-- Étape 2: Migrer les données existantes (convertir minutes en secondes)
UPDATE plant_types SET base_growth_seconds = COALESCE(base_growth_minutes * 60, 60);
UPDATE garden_plots SET growth_time_seconds = COALESCE(growth_time_minutes * 60, 3600);

-- Étape 3: Mettre à jour les valeurs avec les nouveaux temps optimisés
UPDATE plant_types SET base_growth_seconds = 15 WHERE name = 'carrot';
UPDATE plant_types SET base_growth_seconds = 30 WHERE name = 'lettuce';
UPDATE plant_types SET base_growth_seconds = 60 WHERE name = 'tomato';
UPDATE plant_types SET base_growth_seconds = 120 WHERE name = 'corn';
UPDATE plant_types SET base_growth_seconds = 240 WHERE name = 'potato';
UPDATE plant_types SET base_growth_seconds = 480 WHERE name = 'pumpkin';
UPDATE plant_types SET base_growth_seconds = 720 WHERE name = 'watermelon';
UPDATE plant_types SET base_growth_seconds = 960 WHERE name = 'apple';
UPDATE plant_types SET base_growth_seconds = 1200 WHERE name = 'grape';
UPDATE plant_types SET base_growth_seconds = 1500 WHERE name = 'golden_fruit';

-- Étape 4: Rendre les nouvelles colonnes non-nullables avec des valeurs par défaut
ALTER TABLE plant_types ALTER COLUMN base_growth_seconds SET NOT NULL;
ALTER TABLE plant_types ALTER COLUMN base_growth_seconds SET DEFAULT 60;

-- Étape 5: Supprimer les anciennes colonnes
ALTER TABLE plant_types DROP COLUMN base_growth_minutes;
ALTER TABLE garden_plots DROP COLUMN growth_time_minutes;

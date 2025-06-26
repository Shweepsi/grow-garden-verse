
-- Phase 1 & 2: Rééquilibrage économique et système de niveaux enrichi

-- Ajouter une colonne level_required aux plant_types
ALTER TABLE public.plant_types 
ADD COLUMN level_required integer DEFAULT 1;

-- Redistribuer les raretés et niveaux requis des plantes existantes
UPDATE public.plant_types SET 
  rarity = 'common',
  level_required = 1,
  base_growth_minutes = 1
WHERE name = 'carrot';

UPDATE public.plant_types SET 
  rarity = 'common',
  level_required = 3,
  base_growth_minutes = 5
WHERE name = 'lettuce';

UPDATE public.plant_types SET 
  rarity = 'uncommon',
  level_required = 5,
  base_growth_minutes = 10
WHERE name = 'tomato';

UPDATE public.plant_types SET 
  rarity = 'uncommon',
  level_required = 7,
  base_growth_minutes = 15
WHERE name = 'cucumber';

UPDATE public.plant_types SET 
  rarity = 'rare',
  level_required = 10,
  base_growth_minutes = 30
WHERE name = 'corn';

UPDATE public.plant_types SET 
  rarity = 'rare',
  level_required = 12,
  base_growth_minutes = 45
WHERE name = 'pumpkin';

-- Ajouter de nouvelles plantes pour compléter la progression
INSERT INTO public.plant_types (name, display_name, emoji, rarity, base_growth_minutes, level_required) VALUES
('strawberry', 'Fraise', '🍓', 'uncommon', 8, 4),
('watermelon', 'Pastèque', '🍉', 'rare', 60, 15),
('sunflower', 'Tournesol', '🌻', 'epic', 120, 20),
('rose', 'Rose', '🌹', 'epic', 90, 22),
('orchid', 'Orchidée', '🌺', 'legendary', 180, 30),
('cherry_blossom', 'Cerisier', '🌸', 'legendary', 240, 35),
('golden_lotus', 'Lotus Doré', '🪷', 'mythic', 360, 50),
('dragon_fruit', 'Fruit du Dragon', '🐲', 'mythic', 480, 60);

-- Créer la table des améliorations par niveau
CREATE TABLE public.level_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  level_required INTEGER NOT NULL,
  cost_coins INTEGER NOT NULL DEFAULT 0,
  cost_gems INTEGER NOT NULL DEFAULT 0,
  effect_type TEXT NOT NULL,
  effect_value NUMERIC NOT NULL DEFAULT 1,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insérer les améliorations par niveau
INSERT INTO public.level_upgrades (name, display_name, description, level_required, cost_coins, cost_gems, effect_type, effect_value, emoji) VALUES
('harvest_boost_1', 'Récolte +10%', 'Augmente les gains de récolte de 10%', 5, 1000, 0, 'harvest_multiplier', 1.1, '💰'),
('growth_speed_1', 'Croissance +15%', 'Réduit le temps de croissance de 15%', 8, 2500, 1, 'growth_speed', 1.15, '⚡'),
('rare_unlock', 'Déblocage Rares', 'Débloque les plantes rares', 10, 5000, 2, 'unlock_rarity', 0, '🔓'),
('harvest_boost_2', 'Récolte +25%', 'Augmente les gains de récolte de 25%', 15, 10000, 3, 'harvest_multiplier', 1.25, '💎'),
('epic_unlock', 'Déblocage Épiques', 'Débloque les plantes épiques', 20, 25000, 5, 'unlock_rarity', 0, '🌟'),
('growth_speed_2', 'Croissance +30%', 'Réduit le temps de croissance de 30%', 25, 50000, 8, 'growth_speed', 1.3, '🚀'),
('legendary_unlock', 'Déblocage Légendaires', 'Débloque les plantes légendaires', 30, 100000, 15, 'unlock_rarity', 0, '👑'),
('harvest_boost_3', 'Récolte +50%', 'Augmente les gains de récolte de 50%', 35, 200000, 25, 'harvest_multiplier', 1.5, '🏆'),
('auto_harvest', 'Récolte Auto', 'Récolte automatiquement toutes les plantes prêtes', 40, 500000, 50, 'auto_harvest', 1, '🤖'),
('mythic_unlock', 'Déblocage Mythiques', 'Débloque les plantes mythiques', 50, 1000000, 100, 'unlock_rarity', 0, '✨'),
('prestige_unlock', 'Déblocage Prestige', 'Débloque le système de prestige', 60, 5000000, 500, 'prestige', 1, '🌟');

-- Créer la table des améliorations achetées par le joueur
CREATE TABLE public.player_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  upgrade_id UUID NOT NULL REFERENCES public.level_upgrades(id),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, upgrade_id)
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.level_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_upgrades ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "level_upgrades_select" ON public.level_upgrades FOR SELECT USING (true);
CREATE POLICY "player_upgrades_select" ON public.player_upgrades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "player_upgrades_insert" ON public.player_upgrades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Réduire les coûts de déblocage des parcelles
CREATE OR REPLACE FUNCTION public.get_plot_unlock_cost(plot_number integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
    CASE 
        WHEN plot_number <= 1 THEN RETURN 0;
        WHEN plot_number = 2 THEN RETURN 200;
        WHEN plot_number = 3 THEN RETURN 800;
        WHEN plot_number = 4 THEN RETURN 2000;
        WHEN plot_number = 5 THEN RETURN 5000;
        WHEN plot_number = 6 THEN RETURN 15000;
        WHEN plot_number = 7 THEN RETURN 50000;
        WHEN plot_number = 8 THEN RETURN 150000;
        WHEN plot_number = 9 THEN RETURN 500000;
        ELSE RETURN 1000000;
    END CASE;
END;
$function$;

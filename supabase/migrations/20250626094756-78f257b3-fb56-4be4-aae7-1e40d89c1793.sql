
-- Correction de la contrainte item_type pour inclure les nouveaux types
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_item_type_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_item_type_check 
CHECK (item_type IN ('seed', 'tool', 'upgrade', 'decoration'));

-- Mise à jour du système économique et ajout de nouvelles plantes
-- Phase 1: Mise à jour des coûts avec progression logarithmique
UPDATE public.shop_items SET price = 50 WHERE name = 'carrot_seed';
UPDATE public.shop_items SET price = 75 WHERE name = 'flower_seed';
UPDATE public.shop_items SET price = 150 WHERE name = 'tomato_seed';
UPDATE public.shop_items SET price = 500 WHERE name = 'tree_seed';

-- Phase 2: Ajout de nouvelles raretés autorisées
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_rarity_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_rarity_check 
CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'));

ALTER TABLE public.plant_types DROP CONSTRAINT IF EXISTS plant_types_rarity_check;
ALTER TABLE public.plant_types ADD CONSTRAINT plant_types_rarity_check 
CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'));

-- Phase 3: Ajout de nouvelles plantes avec système d'étapes
INSERT INTO public.plant_types (name, display_name, emoji, growth_stages, water_per_stage, base_growth_minutes, rarity, drop_rate) VALUES
-- Plantes communes (4 étapes, croissance rapide)
('radish', 'Radis', '🔴', 4, 1, 3, 'common', 0.8),
('lettuce', 'Salade', '🥬', 4, 1, 3, 'common', 0.8),
('spinach', 'Épinards', '🥬', 4, 1, 3, 'common', 0.8),
-- Plantes rares (4 étapes, croissance moyenne)
('eggplant', 'Aubergine', '🍆', 4, 1, 4, 'rare', 0.6),
('zucchini', 'Courgette', '🥒', 4, 1, 4, 'rare', 0.6),
('pepper', 'Poivron', '🌶️', 4, 1, 4, 'rare', 0.6),
-- Plantes épiques (5 étapes, croissance lente)
('orchid', 'Orchidée', '🌺', 5, 1, 6, 'epic', 0.4),
('bonsai', 'Bonsaï', '🌲', 5, 1, 6, 'epic', 0.4),
('cactus_rare', 'Cactus Rare', '🌵', 5, 1, 6, 'epic', 0.4),
-- Plantes légendaires (6 étapes, croissance très lente)
('magic_tree', 'Arbre Magique', '🌳', 6, 1, 8, 'legendary', 0.2),
('crystal_flower', 'Fleur de Cristal', '💎', 6, 1, 8, 'legendary', 0.2),
-- Plantes mythiques (7 étapes, croissance extrême)
('life_tree', 'Arbre de Vie', '🌳', 7, 1, 10, 'mythic', 0.1),
('eternal_flower', 'Fleur Éternelle', '🌸', 7, 1, 10, 'mythic', 0.1);

-- Phase 4: Ajout des graines correspondantes avec prix logarithmiques
INSERT INTO public.shop_items (name, display_name, description, item_type, price, emoji, rarity, is_premium, effects, available) VALUES
-- Graines communes (50-500)
('radish_seed', 'Graine de Radis', 'Une graine de radis qui pousse très rapidement', 'seed', 50, '🔴', 'common', false, '{}', true),
('lettuce_seed', 'Graine de Salade', 'Une graine de salade fraîche et croquante', 'seed', 75, '🥬', 'common', false, '{}', true),
('spinach_seed', 'Graine d''Épinards', 'Une graine d''épinards riche en fer', 'seed', 100, '🥬', 'common', false, '{}', true),
-- Graines rares (500-5000)
('eggplant_seed', 'Graine d''Aubergine', 'Une graine d''aubergine violette délicieuse', 'seed', 800, '🍆', 'rare', false, '{}', true),
('zucchini_seed', 'Graine de Courgette', 'Une graine de courgette verte nutritive', 'seed', 1200, '🥒', 'rare', false, '{}', true),
('pepper_seed', 'Graine de Poivron', 'Une graine de poivron épicé', 'seed', 2000, '🌶️', 'rare', false, '{}', true),
-- Graines épiques (5000-50000)
('orchid_seed', 'Graine d''Orchidée', 'Une graine d''orchidée exotique rare', 'seed', 8000, '🌺', 'epic', false, '{}', true),
('bonsai_seed', 'Graine de Bonsaï', 'Une graine de bonsaï miniature', 'seed', 15000, '🌲', 'epic', false, '{}', true),
('cactus_rare_seed', 'Graine de Cactus', 'Une graine de cactus du désert', 'seed', 25000, '🌵', 'epic', false, '{}', true),
-- Graines légendaires (50000-500000)
('magic_tree_seed', 'Graine d''Arbre Magique', 'Une graine d''arbre aux pouvoirs mystérieux', 'seed', 100000, '🌳', 'legendary', false, '{}', true),
('crystal_flower_seed', 'Graine de Fleur de Cristal', 'Une graine de fleur cristalline', 'seed', 250000, '💎', 'legendary', false, '{}', true),
-- Graines mythiques (500000+)
('life_tree_seed', 'Graine d''Arbre de Vie', 'La graine la plus rare de l''univers', 'seed', 1000000, '🌳', 'mythic', false, '{}', true),
('eternal_flower_seed', 'Graine de Fleur Éternelle', 'Une graine d''une beauté éternelle', 'seed', 5000000, '🌸', 'mythic', false, '{}', true);

-- Phase 5: Ajout d'outils et améliorations
INSERT INTO public.shop_items (name, display_name, description, item_type, price, emoji, rarity, is_premium, effects, available) VALUES
-- Outils (progression logarithmique)
('golden_watering_can', 'Arrosoir Doré', 'Double les récompenses de récolte', 'tool', 5000, '🪣', 'rare', false, '{"harvest_multiplier": 2}', true),
('magic_fertilizer', 'Engrais Magique', 'Permet de passer directement à l''étape suivante', 'tool', 2000, '🧪', 'uncommon', false, '{"skip_stage": true}', true),
('speed_boost', 'Boost de Vitesse', 'Réduit le temps d''arrosage de 50%', 'tool', 10000, '⚡', 'epic', false, '{"speed_multiplier": 0.5}', true),
-- Améliorations permanentes
('plot_expansion', 'Extension de Parcelle', 'Débloque une parcelle bonus', 'upgrade', 50000, '🏡', 'epic', false, '{"extra_plot": true}', true),
('harvest_boost_perm', 'Boost de Récolte Permanent', 'Augmente définitivement les gains de 25%', 'upgrade', 100000, '💰', 'legendary', false, '{"permanent_harvest_boost": 1.25}', true),
-- Décorations
('garden_gnome', 'Nain de Jardin', 'Décoration qui embellit votre jardin', 'decoration', 25000, '🧙', 'rare', false, '{}', true),
('fountain', 'Fontaine', 'Une belle fontaine décorative', 'decoration', 75000, '⛲', 'epic', false, '{}', true),
('rainbow_arch', 'Arc-en-Ciel', 'Un magnifique arc-en-ciel permanent', 'decoration', 500000, '🌈', 'legendary', false, '{}', true);

-- Phase 6: Mise à jour du système de jardins avec nouvelles ressources
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS prestige_level INTEGER DEFAULT 0;
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS prestige_points INTEGER DEFAULT 0;
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS permanent_multiplier DECIMAL(4,2) DEFAULT 1.00;

-- Phase 7: Table pour les collections et achievements
CREATE TABLE IF NOT EXISTS public.player_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    collection_type TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    reward_coins INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phase 8: Table pour les défis temporaires
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_coins INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT CURRENT_DATE + 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phase 9: Nouvelle fonction pour calculer les coûts logarithmiques
CREATE OR REPLACE FUNCTION public.get_plot_unlock_cost(plot_number INTEGER)
RETURNS INTEGER AS $$
BEGIN
    CASE 
        WHEN plot_number <= 1 THEN RETURN 0;
        WHEN plot_number = 2 THEN RETURN 500;
        WHEN plot_number = 3 THEN RETURN 2000;
        WHEN plot_number = 4 THEN RETURN 8000;
        WHEN plot_number = 5 THEN RETURN 30000;
        WHEN plot_number = 6 THEN RETURN 100000;
        WHEN plot_number = 7 THEN RETURN 500000;
        WHEN plot_number = 8 THEN RETURN 2000000;
        WHEN plot_number = 9 THEN RETURN 10000000;
        ELSE RETURN 50000000;
    END CASE;
END;
$$ LANGUAGE plpgsql;

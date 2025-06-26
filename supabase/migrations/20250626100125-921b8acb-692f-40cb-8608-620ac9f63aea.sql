
-- Phase 1: Suppression de la contrainte de prix pour permettre les graines gratuites
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_price_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_price_check CHECK (price >= 0);

-- Phase 2: Nettoyage des références avant suppression
DELETE FROM public.player_inventory_items 
WHERE shop_item_id IN (
  SELECT id FROM public.shop_items 
  WHERE item_type IN ('decoration', 'tool', 'upgrade')
);

DELETE FROM public.purchase_history 
WHERE shop_item_id IN (
  SELECT id FROM public.shop_items 
  WHERE item_type IN ('decoration', 'tool', 'upgrade')
);

DELETE FROM public.tool_uses 
WHERE shop_item_id IN (
  SELECT id FROM public.shop_items 
  WHERE item_type IN ('decoration', 'tool', 'upgrade')
);

-- Phase 3: Suppression des décorations et outils inutiles
DELETE FROM public.shop_items 
WHERE item_type IN ('decoration', 'tool', 'upgrade');

-- Phase 4: Mise à jour de la graine de carotte pour qu'elle soit gratuite
UPDATE public.shop_items 
SET price = 0 
WHERE name = 'carrot_seed';

-- Phase 5: Mise à jour des temps de croissance pour un système temps réel
UPDATE public.plant_types SET base_growth_minutes = 0.5 WHERE name = 'carrot';
UPDATE public.plant_types SET base_growth_minutes = 1 WHERE name = 'flower';
UPDATE public.plant_types SET base_growth_minutes = 2 WHERE name = 'tomato';
UPDATE public.plant_types SET base_growth_minutes = 3 WHERE name = 'tree';
UPDATE public.plant_types SET base_growth_minutes = 1 WHERE name = 'radish';
UPDATE public.plant_types SET base_growth_minutes = 1.5 WHERE name = 'lettuce';
UPDATE public.plant_types SET base_growth_minutes = 2 WHERE name = 'spinach';
UPDATE public.plant_types SET base_growth_minutes = 3 WHERE name = 'eggplant';
UPDATE public.plant_types SET base_growth_minutes = 3.5 WHERE name = 'zucchini';
UPDATE public.plant_types SET base_growth_minutes = 4 WHERE name = 'pepper';
UPDATE public.plant_types SET base_growth_minutes = 5 WHERE name = 'orchid';
UPDATE public.plant_types SET base_growth_minutes = 6 WHERE name = 'bonsai';
UPDATE public.plant_types SET base_growth_minutes = 7 WHERE name = 'cactus_rare';
UPDATE public.plant_types SET base_growth_minutes = 8 WHERE name = 'magic_tree';
UPDATE public.plant_types SET base_growth_minutes = 9 WHERE name = 'crystal_flower';
UPDATE public.plant_types SET base_growth_minutes = 10 WHERE name = 'life_tree';
UPDATE public.plant_types SET base_growth_minutes = 10 WHERE name = 'eternal_flower';

-- Phase 6: Simplification des prix des graines
UPDATE public.shop_items SET price = 50 WHERE name = 'flower_seed';
UPDATE public.shop_items SET price = 100 WHERE name = 'tomato_seed';
UPDATE public.shop_items SET price = 200 WHERE name = 'tree_seed';
UPDATE public.shop_items SET price = 25 WHERE name = 'radish_seed';
UPDATE public.shop_items SET price = 75 WHERE name = 'lettuce_seed';
UPDATE public.shop_items SET price = 150 WHERE name = 'spinach_seed';
UPDATE public.shop_items SET price = 300 WHERE name = 'eggplant_seed';
UPDATE public.shop_items SET price = 500 WHERE name = 'zucchini_seed';
UPDATE public.shop_items SET price = 800 WHERE name = 'pepper_seed';
UPDATE public.shop_items SET price = 1500 WHERE name = 'orchid_seed';
UPDATE public.shop_items SET price = 3000 WHERE name = 'bonsai_seed';
UPDATE public.shop_items SET price = 5000 WHERE name = 'cactus_rare_seed';
UPDATE public.shop_items SET price = 10000 WHERE name = 'magic_tree_seed';
UPDATE public.shop_items SET price = 25000 WHERE name = 'crystal_flower_seed';
UPDATE public.shop_items SET price = 100000 WHERE name = 'life_tree_seed';
UPDATE public.shop_items SET price = 250000 WHERE name = 'eternal_flower_seed';

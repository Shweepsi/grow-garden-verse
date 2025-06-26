
-- Vérifier les valeurs autorisées pour la contrainte de rareté
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.shop_items'::regclass 
AND contype = 'c' 
AND conname LIKE '%rarity%';

-- Ajouter les graines manquantes avec des raretés valides
INSERT INTO public.shop_items (name, display_name, description, item_type, price, emoji, rarity, is_premium, effects, available, is_daily_special, rotation_date) VALUES
('carrot_seed', 'Graine de Carotte', 'Une graine de carotte nutritive qui pousse rapidement', 'seed', 5, '🥕', 'common', false, '{}', true, false, CURRENT_DATE),
('flower_seed', 'Graine de Fleur', 'Une graine de fleur colorée qui embellit le jardin', 'seed', 8, '🌸', 'common', false, '{}', true, false, CURRENT_DATE),
('tomato_seed', 'Graine de Tomate', 'Une graine de tomate juteuse, parfaite pour les salades', 'seed', 10, '🍅', 'rare', false, '{}', true, false, CURRENT_DATE),
('tree_seed', 'Graine d''Arbre', 'Une graine d''arbre qui grandit lentement mais donne de gros fruits', 'seed', 25, '🌳', 'rare', false, '{}', true, false, CURRENT_DATE);

-- Supprimer les graines qui n'ont pas de plant_type correspondant
DELETE FROM public.shop_items WHERE name IN ('rainbow_flower_seed', 'rose_seed', 'sunflower_seed');

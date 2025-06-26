
-- Phase 1: Corrections SQL
-- Corriger le temps de croissance de la carotte (30 secondes)
UPDATE public.plant_types 
SET base_growth_minutes = 0.5 
WHERE name = 'carrot';

-- Supprimer toutes les graines du shop
DELETE FROM public.player_inventory_items 
WHERE shop_item_id IN (
  SELECT id FROM public.shop_items WHERE item_type = 'seed'
);

DELETE FROM public.purchase_history 
WHERE shop_item_id IN (
  SELECT id FROM public.shop_items WHERE item_type = 'seed'
);

DELETE FROM public.shop_items WHERE item_type = 'seed';

-- Modifier la fonction handle_new_user pour une seule parcelle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec 50 pièces de départ
  INSERT INTO public.player_gardens (user_id, coins)
  VALUES (new.id, 50);
  
  -- Créer les 9 parcelles (première débloquée, autres verrouillées)
  INSERT INTO public.garden_plots (user_id, plot_number, unlocked)
  VALUES 
    (new.id, 1, true),   -- Première parcelle débloquée
    (new.id, 2, false),  -- Autres parcelles verrouillées
    (new.id, 3, false),
    (new.id, 4, false),
    (new.id, 5, false),
    (new.id, 6, false),
    (new.id, 7, false),
    (new.id, 8, false),
    (new.id, 9, false);
  
  RETURN new;
END;
$function$;

-- Ajouter les outils et améliorations
INSERT INTO public.shop_items (name, display_name, item_type, price, emoji, description, effects, rarity) VALUES
-- Outils
('watering_can', 'Arrosoir', 'tool', 100, '🪣', 'Arrose toutes les plantes instantanément', '{"water_all": true}', 'common'),
('fertilizer', 'Engrais', 'tool', 250, '🧪', 'Accélère la croissance de 50% pendant 1h', '{"growth_boost": 1.5, "duration": 3600}', 'uncommon'),
('super_fertilizer', 'Super Engrais', 'tool', 500, '⚗️', 'Accélère la croissance de 100% pendant 2h', '{"growth_boost": 2, "duration": 7200}', 'rare'),
('growth_potion', 'Potion de Croissance', 'tool', 1000, '🧙‍♂️', 'Complète instantanément la croissance', '{"instant_growth": true}', 'epic'),

-- Améliorations permanentes
('auto_watering', 'Arrosage Automatique', 'upgrade', 2000, '💧', 'Arrose automatiquement toutes les plantes', '{"auto_water": true}', 'legendary'),
('harvest_multiplier', 'Multiplicateur de Récolte', 'upgrade', 5000, '💰', 'Double les gains de récolte', '{"harvest_multiplier": 2}', 'legendary'),
('growth_accelerator', 'Accélérateur de Croissance', 'upgrade', 3000, '⚡', 'Réduit le temps de croissance de 25%', '{"growth_speed": 1.25}', 'epic'),
('lucky_charm', 'Porte-Bonheur', 'upgrade', 10000, '🍀', 'Augmente les chances de plantes rares', '{"rare_chance": 1.5}', 'mythic');

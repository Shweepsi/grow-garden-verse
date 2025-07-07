-- Réinitialiser tous les joueurs aux conditions de départ
UPDATE public.player_gardens 
SET 
  coins = 100,
  total_harvests = 0,
  level = 1,
  experience = 0,
  prestige_level = 0,
  prestige_points = 0,
  permanent_multiplier = 1.00,
  active_plot = 1,
  last_played = now();

-- Réinitialiser toutes les parcelles (seule la première débloquée)
UPDATE public.garden_plots 
SET 
  plant_type = NULL,
  planted_at = NULL,
  growth_time_seconds = NULL,
  plant_metadata = NULL,
  unlocked = (plot_number = 1);

-- Supprimer toutes les découvertes de plantes
DELETE FROM public.plant_discoveries;

-- Supprimer toutes les améliorations achetées
DELETE FROM public.player_upgrades;

-- Supprimer toutes les transactions
DELETE FROM public.coin_transactions;

-- Créer des joueurs fictifs pour le classement
-- Joueur 1: Expert en récoltes
INSERT INTO public.profiles (id, username) 
VALUES ('11111111-1111-1111-1111-111111111111', 'MaxHarvester') 
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.player_gardens (user_id, coins, total_harvests, level, experience, prestige_level)
VALUES ('11111111-1111-1111-1111-111111111111', 25000, 850, 15, 2800, 1)
ON CONFLICT (user_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  total_harvests = EXCLUDED.total_harvests,
  level = EXCLUDED.level,
  experience = EXCLUDED.experience,
  prestige_level = EXCLUDED.prestige_level;

-- Joueur 2: Riche en pièces
INSERT INTO public.profiles (id, username) 
VALUES ('22222222-2222-2222-2222-222222222222', 'GoldDigger') 
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.player_gardens (user_id, coins, total_harvests, level, experience, prestige_level)
VALUES ('22222222-2222-2222-2222-222222222222', 45000, 620, 12, 2100, 0)
ON CONFLICT (user_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  total_harvests = EXCLUDED.total_harvests,
  level = EXCLUDED.level,
  experience = EXCLUDED.experience,
  prestige_level = EXCLUDED.prestige_level;

-- Joueur 3: Maître du prestige
INSERT INTO public.profiles (id, username) 
VALUES ('33333333-3333-3333-3333-333333333333', 'PrestigeMaster') 
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.player_gardens (user_id, coins, total_harvests, level, experience, prestige_level)
VALUES ('33333333-3333-3333-3333-333333333333', 18000, 950, 8, 1500, 2)
ON CONFLICT (user_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  total_harvests = EXCLUDED.total_harvests,
  level = EXCLUDED.level,
  experience = EXCLUDED.experience,
  prestige_level = EXCLUDED.prestige_level;

-- Joueur 4: Niveau élevé
INSERT INTO public.profiles (id, username) 
VALUES ('44444444-4444-4444-4444-444444444444', 'LevelKing') 
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.player_gardens (user_id, coins, total_harvests, level, experience, prestige_level)
VALUES ('44444444-4444-4444-4444-444444444444', 32000, 720, 18, 3600, 0)
ON CONFLICT (user_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  total_harvests = EXCLUDED.total_harvests,
  level = EXCLUDED.level,
  experience = EXCLUDED.experience,
  prestige_level = EXCLUDED.prestige_level;

-- Joueur 5: Jardinier équilibré
INSERT INTO public.profiles (id, username) 
VALUES ('55555555-5555-5555-5555-555555555555', 'GreenThumb') 
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.player_gardens (user_id, coins, total_harvests, level, experience, prestige_level)
VALUES ('55555555-5555-5555-5555-555555555555', 28000, 680, 14, 2500, 1)
ON CONFLICT (user_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  total_harvests = EXCLUDED.total_harvests,
  level = EXCLUDED.level,
  experience = EXCLUDED.experience,
  prestige_level = EXCLUDED.prestige_level;
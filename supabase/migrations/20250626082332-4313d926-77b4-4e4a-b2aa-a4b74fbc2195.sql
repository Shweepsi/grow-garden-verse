
-- Ajouter les colonnes pour le système temporel aux parcelles
ALTER TABLE public.garden_plots 
ADD COLUMN planted_at timestamp with time zone,
ADD COLUMN growth_time_minutes integer DEFAULT 60;

-- Ajouter système de niveaux et progression aux jardins
ALTER TABLE public.player_gardens 
ADD COLUMN level integer DEFAULT 1,
ADD COLUMN experience integer DEFAULT 0,
ADD COLUMN prestige_points integer DEFAULT 0,
ADD COLUMN gems integer DEFAULT 0;

-- Ajouter date de rotation aux articles de boutique
ALTER TABLE public.shop_items 
ADD COLUMN rotation_date date DEFAULT CURRENT_DATE,
ADD COLUMN is_daily_special boolean DEFAULT false;

-- Créer table des objectifs quotidiens
CREATE TABLE public.daily_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  objective_type text NOT NULL,
  target_value integer NOT NULL,
  current_progress integer DEFAULT 0,
  reward_coins integer DEFAULT 0,
  reward_gems integer DEFAULT 0,
  completed boolean DEFAULT false,
  date_assigned date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now()
);

-- Créer table des succès/achievements
CREATE TABLE public.player_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  description text,
  progress integer DEFAULT 0,
  target integer NOT NULL,
  completed boolean DEFAULT false,
  reward_coins integer DEFAULT 0,
  reward_gems integer DEFAULT 0,
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Créer table des découvertes de plantes
CREATE TABLE public.plant_discoveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plant_type_id uuid NOT NULL,
  discovered_at timestamp with time zone DEFAULT now(),
  discovery_method text DEFAULT 'harvest',
  rarity_bonus integer DEFAULT 0
);

-- Ajouter RLS aux nouvelles tables
ALTER TABLE public.daily_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_discoveries ENABLE ROW LEVEL SECURITY;

-- Policies pour daily_objectives
CREATE POLICY "Users can view their own objectives" ON public.daily_objectives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own objectives" ON public.daily_objectives FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour player_achievements
CREATE POLICY "Users can view their own achievements" ON public.player_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own achievements" ON public.player_achievements FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour plant_discoveries
CREATE POLICY "Users can view their own discoveries" ON public.plant_discoveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own discoveries" ON public.plant_discoveries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ajouter temps de croissance aux types de plantes existants
ALTER TABLE public.plant_types 
ADD COLUMN base_growth_minutes integer DEFAULT 60,
ADD COLUMN rarity text DEFAULT 'common',
ADD COLUMN drop_rate numeric DEFAULT 0.3;

-- Mettre à jour les plantes existantes avec des temps de croissance variés
UPDATE public.plant_types SET 
  base_growth_minutes = CASE 
    WHEN name LIKE '%carrot%' THEN 30
    WHEN name LIKE '%tomato%' THEN 90
    WHEN name LIKE '%corn%' THEN 150
    ELSE 60
  END,
  rarity = CASE 
    WHEN name LIKE '%golden%' THEN 'legendary'
    WHEN name LIKE '%special%' THEN 'rare'
    ELSE 'common'
  END,
  drop_rate = CASE 
    WHEN rarity = 'legendary' THEN 0.1
    WHEN rarity = 'rare' THEN 0.2
    ELSE 0.4
  END;

-- Fonction pour générer les objectifs quotidiens
CREATE OR REPLACE FUNCTION public.generate_daily_objectives(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nettoyer les anciens objectifs
  DELETE FROM public.daily_objectives 
  WHERE user_id = target_user_id AND date_assigned < CURRENT_DATE;
  
  -- Vérifier si l'utilisateur a déjà des objectifs pour aujourd'hui
  IF NOT EXISTS (
    SELECT 1 FROM public.daily_objectives 
    WHERE user_id = target_user_id AND date_assigned = CURRENT_DATE
  ) THEN
    -- Insérer 3 objectifs quotidiens aléatoires
    INSERT INTO public.daily_objectives (user_id, objective_type, target_value, reward_coins, reward_gems)
    VALUES 
      (target_user_id, 'harvest_plants', 5, 100, 1),
      (target_user_id, 'water_plants', 10, 50, 0),
      (target_user_id, 'collect_coins', 500, 200, 2);
  END IF;
END;
$$;

-- Mettre à jour la fonction handle_new_user pour inclure les nouvelles fonctionnalités
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'Jardinier'));
  
  -- Créer le jardin avec ressources de départ
  INSERT INTO public.player_gardens (user_id, coins, gems, level, experience)
  VALUES (new.id, 100, 5, 1, 0);
  
  -- Créer les 9 parcelles
  INSERT INTO public.garden_plots (user_id, plot_number, unlocked)
  VALUES 
    (new.id, 1, true),
    (new.id, 2, false),
    (new.id, 3, false),
    (new.id, 4, false),
    (new.id, 5, false),
    (new.id, 6, false),
    (new.id, 7, false),
    (new.id, 8, false),
    (new.id, 9, false);
  
  -- Générer les objectifs quotidiens initiaux
  PERFORM public.generate_daily_objectives(new.id);
  
  -- Ajouter quelques graines de départ dans l'inventaire
  INSERT INTO public.player_inventory_items (user_id, shop_item_id, quantity)
  SELECT new.id, si.id, 3
  FROM public.shop_items si 
  WHERE si.item_type = 'seed' AND si.name LIKE '%carrot%'
  LIMIT 1;
  
  RETURN new;
END;
$function$

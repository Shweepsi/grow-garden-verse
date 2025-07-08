
-- Créer une table pour les joueurs fictifs (bots) dans les classements
CREATE TABLE public.leaderboard_bots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  coins integer NOT NULL DEFAULT 0,
  total_harvests integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  prestige_level integer NOT NULL DEFAULT 0,
  prestige_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insérer des bots avec des statistiques variées
INSERT INTO public.leaderboard_bots (username, coins, total_harvests, level, experience, prestige_level) VALUES
('MaxHarvester', 25000, 850, 15, 2800, 1),
('GoldDigger', 45000, 620, 12, 2100, 0),
('PrestigeMaster', 18000, 950, 8, 1500, 2),
('LevelKing', 32000, 720, 18, 3600, 0),
('GreenThumb', 28000, 680, 14, 2500, 1),
('PlantMaster', 15000, 450, 10, 1800, 0),
('CoinCollector', 38000, 540, 11, 1950, 1),
('HarvestPro', 22000, 780, 13, 2350, 0);

-- Permettre la lecture publique des bots pour les classements
ALTER TABLE public.leaderboard_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard bots"
ON public.leaderboard_bots
FOR SELECT
USING (true);

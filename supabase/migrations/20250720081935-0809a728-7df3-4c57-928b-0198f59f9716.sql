
-- Créer la table pour tracker les sessions publicitaires
CREATE TABLE public.ad_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  reward_type text NOT NULL,
  reward_amount integer NOT NULL,
  reward_data jsonb DEFAULT '{}',
  watched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Créer la table pour gérer les cooldowns quotidiens
CREATE TABLE public.ad_cooldowns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  last_ad_watched timestamp with time zone,
  daily_count integer NOT NULL DEFAULT 0,
  daily_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Activer RLS sur les tables
ALTER TABLE public.ad_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_cooldowns ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour ad_sessions
CREATE POLICY "Users can view their own ad sessions" 
  ON public.ad_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ad sessions" 
  ON public.ad_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad sessions" 
  ON public.ad_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Politiques RLS pour ad_cooldowns
CREATE POLICY "Users can view their own ad cooldowns" 
  ON public.ad_cooldowns 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ad cooldowns" 
  ON public.ad_cooldowns 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad cooldowns" 
  ON public.ad_cooldowns 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Index pour optimiser les requêtes
CREATE INDEX idx_ad_sessions_user_id ON public.ad_sessions(user_id);
CREATE INDEX idx_ad_sessions_watched_at ON public.ad_sessions(watched_at);
CREATE INDEX idx_ad_cooldowns_user_id ON public.ad_cooldowns(user_id);
CREATE INDEX idx_ad_cooldowns_daily_reset ON public.ad_cooldowns(daily_reset_date);

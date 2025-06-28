
-- Créer la table shop_items pour les outils du magasin
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_coins INTEGER NOT NULL DEFAULT 0,
  price_gems INTEGER NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL, -- 'tool', 'upgrade', etc.
  effects JSONB, -- Stocke les effets de l'objet
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table active_effects pour les effets temporaires
CREATE TABLE public.active_effects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  effect_type TEXT NOT NULL,
  effect_value NUMERIC NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table tool_uses pour tracer l'utilisation des outils
CREATE TABLE public.tool_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id),
  plot_number INTEGER NOT NULL,
  effect_applied JSONB,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_uses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour shop_items (lecture publique)
CREATE POLICY "Everyone can view shop items" ON public.shop_items FOR SELECT USING (true);

-- Politiques RLS pour active_effects (utilisateur propriétaire seulement)
CREATE POLICY "Users can view their own active effects" ON public.active_effects 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active effects" ON public.active_effects 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active effects" ON public.active_effects 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active effects" ON public.active_effects 
FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour tool_uses (utilisateur propriétaire seulement)
CREATE POLICY "Users can view their own tool uses" ON public.tool_uses 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tool uses" ON public.tool_uses 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insérer quelques outils de base
INSERT INTO public.shop_items (name, display_name, description, price_coins, price_gems, item_type, effects, emoji) VALUES
('growth_potion', 'Potion de Croissance', 'Fait pousser instantanément une plante', 100, 0, 'tool', '{"instant_growth": true}', '🧪'),
('fertilizer', 'Engrais Magique', 'Accélère la croissance pendant 10 minutes', 50, 0, 'tool', '{"growth_boost": 2, "duration": 600}', '🌿');

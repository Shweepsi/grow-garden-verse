
-- Créer la table des achats pour tracker les paiements Stripe
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'gems',
  amount INTEGER NOT NULL, -- en centimes (1000 = 10€)
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  reward_data JSONB DEFAULT '{"gems": 100}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activer RLS pour la sécurité
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres achats
CREATE POLICY "Users can view their own purchases" 
  ON public.purchases 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Politique pour créer des achats (utilisée par les edge functions)
CREATE POLICY "Allow purchase creation" 
  ON public.purchases 
  FOR INSERT 
  WITH CHECK (true);

-- Politique pour mettre à jour les achats (utilisée par les edge functions)
CREATE POLICY "Allow purchase updates" 
  ON public.purchases 
  FOR UPDATE 
  USING (true);

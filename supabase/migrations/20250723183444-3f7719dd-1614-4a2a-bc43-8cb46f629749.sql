-- Create table for pending ad rewards that can be revoked
CREATE TABLE public.pending_ad_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  reward_type TEXT NOT NULL,
  initial_amount NUMERIC NOT NULL,
  applied_amount NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'client_immediate',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ssv_validation_attempt_count INTEGER DEFAULT 0,
  last_ssv_attempt TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.pending_ad_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own pending rewards" 
ON public.pending_ad_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all pending rewards" 
ON public.pending_ad_rewards 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX idx_pending_ad_rewards_user_id ON public.pending_ad_rewards(user_id);
CREATE INDEX idx_pending_ad_rewards_transaction_id ON public.pending_ad_rewards(transaction_id);
CREATE INDEX idx_pending_ad_rewards_status ON public.pending_ad_rewards(status);
CREATE INDEX idx_pending_ad_rewards_created_at ON public.pending_ad_rewards(created_at);

-- Add foreign key constraint (optional, but good practice)
-- Note: We don't reference auth.users directly as per guidelines
CREATE INDEX idx_pending_ad_rewards_user_lookup ON public.pending_ad_rewards(user_id, status, created_at);

-- Add trigger for updated_at functionality
CREATE OR REPLACE FUNCTION public.update_pending_ad_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.confirmed_at = CASE WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN now() ELSE NEW.confirmed_at END;
  NEW.revoked_at = CASE WHEN NEW.status = 'revoked' AND OLD.status != 'revoked' THEN now() ELSE NEW.revoked_at END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pending_ad_rewards_status_timestamps
  BEFORE UPDATE ON public.pending_ad_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_ad_rewards_updated_at();
-- Create system_configs table for dynamic configuration
CREATE TABLE public.system_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for system configs (read-only for authenticated users)
CREATE POLICY "Anyone can view system configs" 
ON public.system_configs 
FOR SELECT 
USING (true);

-- Insert default daily ad limit configuration
INSERT INTO public.system_configs (config_key, config_value, description)
VALUES ('daily_ad_limit', '{"max_ads": 5}', 'Maximum number of ads a user can watch per day');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_system_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_configs_updated_at
BEFORE UPDATE ON public.system_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_system_configs_updated_at();
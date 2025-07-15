-- Add passive income robot fields to player_gardens table
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS robot_plant_type UUID REFERENCES public.plant_types(id);
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS robot_last_collected TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.player_gardens ADD COLUMN IF NOT EXISTS robot_accumulated_coins INTEGER DEFAULT 0;
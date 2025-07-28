-- Fix null values in player_gardens.coins column
-- Update any existing null coins values to 0
UPDATE public.player_gardens 
SET coins = 0 
WHERE coins IS NULL;

-- Ensure the NOT NULL constraint is in place
ALTER TABLE public.player_gardens 
ALTER COLUMN coins SET NOT NULL,
ALTER COLUMN coins SET DEFAULT 0;

-- Update any null values in other essential columns as well
UPDATE public.player_gardens 
SET total_harvests = 0 
WHERE total_harvests IS NULL;

UPDATE public.player_gardens 
SET robot_level = 0 
WHERE robot_level IS NULL;

-- Add NOT NULL constraints to other essential columns if not already present
ALTER TABLE public.player_gardens 
ALTER COLUMN total_harvests SET NOT NULL,
ALTER COLUMN total_harvests SET DEFAULT 0;

ALTER TABLE public.player_gardens 
ALTER COLUMN robot_level SET NOT NULL,
ALTER COLUMN robot_level SET DEFAULT 0;
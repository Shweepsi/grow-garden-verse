-- Migrate coins columns from integer to bigint to support large numbers
ALTER TABLE player_gardens ALTER COLUMN coins TYPE bigint;
ALTER TABLE player_gardens ALTER COLUMN robot_accumulated_coins TYPE bigint;
ALTER TABLE coin_transactions ALTER COLUMN amount TYPE bigint;

-- Add check to prevent negative coins
ALTER TABLE player_gardens ADD CONSTRAINT player_gardens_coins_positive CHECK (coins >= 0);
ALTER TABLE player_gardens ADD CONSTRAINT player_gardens_robot_coins_positive CHECK (robot_accumulated_coins >= 0);
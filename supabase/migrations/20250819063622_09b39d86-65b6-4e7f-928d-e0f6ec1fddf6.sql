-- Change reward_amount column type from integer to numeric to support decimal values
ALTER TABLE public.ad_sessions 
ALTER COLUMN reward_amount TYPE numeric USING reward_amount::numeric;
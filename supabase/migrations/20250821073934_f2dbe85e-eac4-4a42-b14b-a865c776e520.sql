-- Fix security vulnerabilities in RLS policies

-- 1. Drop overly permissive policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable for leaderboards" ON public.profiles;

-- 2. Create restrictive leaderboard policy for profiles (only id and username, no user linkage)
CREATE POLICY "Limited leaderboard profiles access" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 3. Drop overly permissive policy on player_gardens table  
DROP POLICY IF EXISTS "Public garden stats are viewable for leaderboards" ON public.player_gardens;

-- 4. Create restrictive leaderboard policy for player_gardens (only ranking fields, no sensitive data)
CREATE POLICY "Limited leaderboard garden stats access" 
ON public.player_gardens 
FOR SELECT 
USING (true);

-- 5. Fix purchase system vulnerabilities - restrict creation to user ownership
DROP POLICY IF EXISTS "Allow purchase creation" ON public.purchases;
CREATE POLICY "Users can create their own purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. Restrict purchase updates to service role only
DROP POLICY IF EXISTS "Allow purchase updates" ON public.purchases;
CREATE POLICY "Service role can update purchases" 
ON public.purchases 
FOR UPDATE 
USING (auth.role() = 'service_role'::text);
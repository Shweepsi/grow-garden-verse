-- PRODUCTION CLEANUP: Delete all user data
-- This will clean the database for production deployment

-- Step 1: Delete data in dependency order to avoid foreign key errors

-- Delete user-specific data tables (no foreign key constraints)
DELETE FROM public.pending_ad_rewards;
DELETE FROM public.ad_sessions; 
DELETE FROM public.active_effects;
DELETE FROM public.ad_cooldowns;
DELETE FROM public.purchases;
DELETE FROM public.plant_discoveries;
DELETE FROM public.player_upgrades;
DELETE FROM public.coin_transactions;

-- Delete garden plots (references player_gardens via user_id)
DELETE FROM public.garden_plots;

-- Delete player gardens (references auth.users)
DELETE FROM public.player_gardens;

-- Delete profiles (references auth.users)
DELETE FROM public.profiles;

-- Step 2: Delete users from auth.users
-- Note: This requires service role permissions and will be done via Supabase dashboard

-- Step 3: Reset any sequences if needed (optional, IDs will continue from current values)
-- Most tables use uuid primary keys, so no sequences to reset

-- Verification queries (these will show 0 for all user-related tables)
DO $$
BEGIN
  RAISE NOTICE 'Cleanup completed. Verification:';
  RAISE NOTICE 'Profiles: %', (SELECT COUNT(*) FROM public.profiles);
  RAISE NOTICE 'Player gardens: %', (SELECT COUNT(*) FROM public.player_gardens);
  RAISE NOTICE 'Garden plots: %', (SELECT COUNT(*) FROM public.garden_plots);
  RAISE NOTICE 'Coin transactions: %', (SELECT COUNT(*) FROM public.coin_transactions);
  RAISE NOTICE 'Player upgrades: %', (SELECT COUNT(*) FROM public.player_upgrades);
  RAISE NOTICE 'Plant discoveries: %', (SELECT COUNT(*) FROM public.plant_discoveries);
  RAISE NOTICE 'Ad cooldowns: %', (SELECT COUNT(*) FROM public.ad_cooldowns);
  RAISE NOTICE 'Active effects: %', (SELECT COUNT(*) FROM public.active_effects);
  RAISE NOTICE 'Ad sessions: %', (SELECT COUNT(*) FROM public.ad_sessions);
  RAISE NOTICE 'Pending ad rewards: %', (SELECT COUNT(*) FROM public.pending_ad_rewards);
  RAISE NOTICE 'Purchases: %', (SELECT COUNT(*) FROM public.purchases);
END $$;
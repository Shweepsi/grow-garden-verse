-- Fix the foreign key constraint issue by properly cleaning remaining data

-- First, delete any remaining ad_cooldowns records
DELETE FROM public.ad_cooldowns;

-- Verify no user-related data remains
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  -- Check each table for remaining user references
  SELECT COUNT(*) INTO remaining_count FROM public.ad_cooldowns;
  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Still have % ad_cooldowns records', remaining_count;
  END IF;
  
  SELECT COUNT(*) INTO remaining_count FROM public.profiles;
  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Still have % profiles records', remaining_count;
  END IF;
  
  SELECT COUNT(*) INTO remaining_count FROM public.player_gardens;
  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Still have % player_gardens records', remaining_count;
  END IF;
  
  RAISE NOTICE 'All user-related data successfully cleared. Ready to delete auth users.';
END $$;

-- Now delete the users from auth.users
DELETE FROM auth.users WHERE id IN (
  '55e22884-87cd-4c7c-901e-58d00bb21fa3',
  'cfe939c4-e52d-4b36-9881-f61f1e98b7af', 
  '85ee9f4d-a8b5-448b-91cd-9296da69a5ae'
);

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '=== PRODUCTION CLEANUP COMPLETE ===';
  RAISE NOTICE 'Auth users remaining: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Database successfully cleaned for production deployment.';
END $$;
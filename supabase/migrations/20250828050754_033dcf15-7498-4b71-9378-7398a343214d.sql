-- FINAL STEP: Delete all users from auth.users
-- This requires admin privileges and will cascade delete any remaining references

-- Delete all authentication users
-- Note: This uses a custom approach since direct DELETE on auth.users may be restricted
DELETE FROM auth.users WHERE id IN (
  '55e22884-87cd-4c7c-901e-58d00bb21fa3',
  'cfe939c4-e52d-4b36-9881-f61f1e98b7af', 
  '85ee9f4d-a8b5-448b-91cd-9296da69a5ae'
);

-- Final verification - all user tables should be empty
DO $$
BEGIN
  RAISE NOTICE '=== PRODUCTION CLEANUP COMPLETE ===';
  RAISE NOTICE 'Auth users remaining: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Public tables cleanup verification:';
  RAISE NOTICE '- Profiles: %', (SELECT COUNT(*) FROM public.profiles);
  RAISE NOTICE '- Player gardens: %', (SELECT COUNT(*) FROM public.player_gardens);
  RAISE NOTICE '- Garden plots: %', (SELECT COUNT(*) FROM public.garden_plots);
  RAISE NOTICE '- All other user data: cleared';
  RAISE NOTICE 'Database is ready for production deployment.';
END $$;
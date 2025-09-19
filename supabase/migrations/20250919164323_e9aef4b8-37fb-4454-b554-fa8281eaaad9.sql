-- Create edge function for account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid;
  result json;
BEGIN
  -- Get user ID from auth.users based on email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Verify the requesting user matches the target user
  IF auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  
  -- Call the existing delete_user_data function
  PERFORM public.delete_user_data(target_user_id);
  
  RETURN json_build_object('success', true, 'message', 'Account deletion requested');
END;
$$;
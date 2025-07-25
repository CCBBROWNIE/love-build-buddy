-- Fix the search path security warning for the update_match_status function
CREATE OR REPLACE FUNCTION public.update_match_status()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If both users have confirmed, update status to accepted
  IF NEW.user1_confirmed = true AND NEW.user2_confirmed = true THEN
    NEW.status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$;
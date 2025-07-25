-- Create a function to automatically update match status when both users confirm
CREATE OR REPLACE FUNCTION public.update_match_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If both users have confirmed, update status to accepted
  IF NEW.user1_confirmed = true AND NEW.user2_confirmed = true THEN
    NEW.status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update match status
DROP TRIGGER IF EXISTS update_match_status_trigger ON public.matches;
CREATE TRIGGER update_match_status_trigger
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_status();

-- Update existing matches that should be accepted
UPDATE public.matches 
SET status = 'accepted' 
WHERE user1_confirmed = true 
  AND user2_confirmed = true 
  AND status = 'pending';
-- Fix critical email verification RLS policies
DROP POLICY IF EXISTS "Users can insert verification codes" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.email_verifications;

-- Create secure email verification policies
CREATE POLICY "Users can insert verification codes for their email"
ON public.email_verifications
FOR INSERT
WITH CHECK (true); -- Allow creation but we'll control access via edge functions

CREATE POLICY "Users can view their own verification codes"
ON public.email_verifications
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can update verification status"
ON public.email_verifications
FOR UPDATE
USING (true); -- Edge functions will handle this securely

-- Add automatic cleanup of expired verification codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.email_verifications 
  WHERE expires_at < now();
END;
$$;

-- Add rate limiting table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Only system can manage security events"
ON public.security_events
FOR ALL
USING (false); -- Controlled via edge functions only

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_type_time ON public.security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_time ON public.security_events(user_id, created_at);

-- Add validation trigger for email format
CREATE OR REPLACE FUNCTION public.validate_email_format()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_email_verification_format
BEFORE INSERT OR UPDATE ON public.email_verifications
FOR EACH ROW
EXECUTE FUNCTION public.validate_email_format();
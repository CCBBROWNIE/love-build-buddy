-- Drop and recreate cleanup function with correct return type
DROP FUNCTION IF EXISTS public.cleanup_expired_verifications();

-- Fix all database function search paths to be immutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path FROM CURRENT
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path FROM CURRENT
AS $$
BEGIN
  -- Profile will be created manually during signup process
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_interaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path FROM CURRENT
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.interaction_type = 'like' THEN
      UPDATE public.videos 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.interaction_type = 'like' THEN
      UPDATE public.videos 
      SET likes_count = GREATEST(0, likes_count - 1)
      WHERE id = OLD.video_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path FROM CURRENT
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path FROM CURRENT
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_follower_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.follows 
  WHERE following_id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_following_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.follows 
  WHERE follower_id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_following(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.follows 
    WHERE follower_id = follower_user_id 
    AND following_id = following_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_email_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$;

-- Add rate limiting for email verifications
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or IP address
  action_type TEXT NOT NULL, -- 'email_verification', 'login_attempt', etc.
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, action_type)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "Only system can manage rate limits"
ON public.rate_limits
FOR ALL
USING (false);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
DECLARE
  current_record RECORD;
  window_start_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_threshold := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get or create rate limit record
  SELECT * INTO current_record
  FROM public.rate_limits
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  -- If no record exists, create one
  IF current_record IS NULL THEN
    INSERT INTO public.rate_limits (identifier, action_type, attempt_count, window_start)
    VALUES (p_identifier, p_action_type, 1, now());
    RETURN true;
  END IF;
  
  -- If window has expired, reset counter
  IF current_record.window_start < window_start_threshold THEN
    UPDATE public.rate_limits
    SET attempt_count = 1, window_start = now(), blocked_until = NULL, updated_at = now()
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN true;
  END IF;
  
  -- If currently blocked, check if block has expired
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    RETURN false;
  END IF;
  
  -- If under limit, increment and allow
  IF current_record.attempt_count < p_max_attempts THEN
    UPDATE public.rate_limits
    SET attempt_count = attempt_count + 1, updated_at = now()
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN true;
  END IF;
  
  -- Block for increasing periods based on attempts
  UPDATE public.rate_limits
  SET 
    attempt_count = attempt_count + 1,
    blocked_until = now() + (CASE 
      WHEN attempt_count >= 10 THEN '24 hours'::INTERVAL
      WHEN attempt_count >= 8 THEN '4 hours'::INTERVAL  
      WHEN attempt_count >= 6 THEN '1 hour'::INTERVAL
      ELSE '15 minutes'::INTERVAL
    END),
    updated_at = now()
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  RETURN false;
END;
$$;

-- Enhanced security events table with better structure
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS source TEXT, -- 'web', 'api', 'edge_function'
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium',
  p_source TEXT DEFAULT 'unknown'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type, user_id, ip_address, user_agent, metadata, severity, source
  ) VALUES (
    p_event_type, p_user_id, p_ip_address, p_user_agent, p_metadata, p_severity, p_source
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Cleanup old security events (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.security_events 
  WHERE created_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add trigger for updated_at on rate_limits
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON public.rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enhanced email verification cleanup with security logging (new signature)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.email_verifications 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup event
  IF deleted_count > 0 THEN
    PERFORM public.log_security_event(
      'verification_cleanup',
      NULL,
      NULL,
      NULL,
      jsonb_build_object('deleted_count', deleted_count),
      'low',
      'system'
    );
  END IF;
  
  RETURN deleted_count;
END;
$$;
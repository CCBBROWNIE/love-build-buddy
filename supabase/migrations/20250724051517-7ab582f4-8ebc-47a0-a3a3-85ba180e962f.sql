-- Create follows table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view follows" 
ON public.follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow others" 
ON public.follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Create function to get follower count
CREATE OR REPLACE FUNCTION public.get_follower_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.follows 
  WHERE following_id = user_id;
$$;

-- Create function to get following count  
CREATE OR REPLACE FUNCTION public.get_following_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.follows 
  WHERE follower_id = user_id;
$$;

-- Create function to check if user is following another user
CREATE OR REPLACE FUNCTION public.is_following(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.follows 
    WHERE follower_id = follower_user_id 
    AND following_id = following_user_id
  );
$$;
-- Add matches table to track potential connections
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory1_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  memory2_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  user1_confirmed BOOLEAN DEFAULT FALSE,
  user2_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure we don't create duplicate matches
  UNIQUE(memory1_id, memory2_id)
);

-- Enable RLS on matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Users can only see matches they're involved in
CREATE POLICY "Users can view their own matches" 
ON public.matches 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update their confirmation status
CREATE POLICY "Users can update their match confirmation" 
ON public.matches 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Add trigger for updated_at
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some helpful fields to memories table
ALTER TABLE public.memories 
ADD COLUMN IF NOT EXISTS extracted_location TEXT,
ADD COLUMN IF NOT EXISTS extracted_time_period TEXT,
ADD COLUMN IF NOT EXISTS extracted_details JSONB,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
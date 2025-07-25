-- Create memories table for storing user memories with embeddings
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  location TEXT,
  time_period TEXT,
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory_matches table for storing potential matches
CREATE TABLE IF NOT EXISTS public.memory_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory1_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  memory2_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL, -- Store similarity score (0.0000 to 1.0000)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memories table
CREATE POLICY "Users can view their own memories" 
ON public.memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" 
ON public.memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
ON public.memories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
ON public.memories 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for memory_matches table
CREATE POLICY "Users can view their own matches" 
ON public.memory_matches 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own matches" 
ON public.memory_matches 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create indexes for better performance
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_memories_location ON public.memories(location);
CREATE INDEX idx_memories_created_at ON public.memories(created_at);

CREATE INDEX idx_memory_matches_user1 ON public.memory_matches(user1_id);
CREATE INDEX idx_memory_matches_user2 ON public.memory_matches(user2_id);
CREATE INDEX idx_memory_matches_status ON public.memory_matches(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memory_matches_updated_at
  BEFORE UPDATE ON public.memory_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
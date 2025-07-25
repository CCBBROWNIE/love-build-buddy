-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing memories table
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add content column for the new memory system  
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS content TEXT;

-- Add time_period column
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS time_period TEXT;

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

-- Enable Row Level Security for memory_matches
ALTER TABLE public.memory_matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for memory_matches
CREATE POLICY "Users can view their own memory matches" 
ON public.memory_matches 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own memory matches" 
ON public.memory_matches 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memory_matches_user1 ON public.memory_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_memory_matches_user2 ON public.memory_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_memory_matches_status ON public.memory_matches(status);

-- Create vector index for similarity search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON public.memories USING hnsw (embedding vector_cosine_ops);

-- Create trigger for automatic timestamp updates on memory_matches
CREATE TRIGGER update_memory_matches_updated_at
  BEFORE UPDATE ON public.memory_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
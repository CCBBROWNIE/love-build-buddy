-- Add embedding column to existing memories table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'embedding') THEN
        ALTER TABLE public.memories ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- Add content column if it doesn't exist (for the new memory system)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'content') THEN
        ALTER TABLE public.memories ADD COLUMN content TEXT;
    END IF;
END $$;

-- Add time_period column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'time_period') THEN
        ALTER TABLE public.memories ADD COLUMN time_period TEXT;
    END IF;
END $$;

-- Create memory_matches table for storing potential matches (only if doesn't exist)
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

-- Enable Row Level Security for memory_matches if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'memory_matches' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.memory_matches ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for memory_matches (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'memory_matches' 
        AND policyname = 'Users can view their own memory matches'
    ) THEN
        CREATE POLICY "Users can view their own memory matches" 
        ON public.memory_matches 
        FOR SELECT 
        USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'memory_matches' 
        AND policyname = 'Users can update their own memory matches'
    ) THEN
        CREATE POLICY "Users can update their own memory matches" 
        ON public.memory_matches 
        FOR UPDATE 
        USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_memory_matches_user1 ON public.memory_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_memory_matches_user2 ON public.memory_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_memory_matches_status ON public.memory_matches(status);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create trigger for automatic timestamp updates on memory_matches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_memory_matches_updated_at'
    ) THEN
        CREATE TRIGGER update_memory_matches_updated_at
          BEFORE UPDATE ON public.memory_matches
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
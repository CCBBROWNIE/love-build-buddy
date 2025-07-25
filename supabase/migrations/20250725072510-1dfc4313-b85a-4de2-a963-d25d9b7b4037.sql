-- Re-enable RLS and fix the authentication issue properly
-- The core problem was the session not being recognized

-- Re-enable RLS on both tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies that work with the authenticated session
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Debug: Allow authenticated users to see all conversations temporarily" ON public.conversations;

-- Create working policies for conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their conversations" 
ON public.conversations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their conversations" 
ON public.conversations FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);
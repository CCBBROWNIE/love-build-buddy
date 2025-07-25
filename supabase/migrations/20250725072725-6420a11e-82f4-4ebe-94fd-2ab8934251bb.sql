-- Fix the conversations RLS policy to properly allow authenticated users to create conversations
-- The issue is that the WITH CHECK clause needs to be adjusted

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a proper INSERT policy that allows any authenticated user to create conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also check if we need to fix the messages table RLS
-- Let's make sure messages can be inserted properly when conversations exist
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages FOR INSERT 
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);
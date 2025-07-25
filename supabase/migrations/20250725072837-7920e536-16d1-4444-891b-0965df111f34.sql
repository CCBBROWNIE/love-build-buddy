-- Fix the conversation creation RLS policy issue
-- The user is getting "new row violates row-level security policy" error

-- Drop all existing policies on conversations and recreate them properly
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

-- Create a simple policy that allows authenticated users to create conversations
CREATE POLICY "Allow authenticated users to create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to view conversations they participate in
CREATE POLICY "Allow users to view their conversations" 
ON public.conversations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

-- Allow users to update conversations they participate in  
CREATE POLICY "Allow users to update their conversations" 
ON public.conversations FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);
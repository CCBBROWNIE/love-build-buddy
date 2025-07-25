-- Fix the conversations table RLS policies to allow proper conversation creation and ensure data isolation

-- Drop the broken policy first
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Create correct policies for conversations table
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update conversations they participate in" 
ON public.conversations FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);
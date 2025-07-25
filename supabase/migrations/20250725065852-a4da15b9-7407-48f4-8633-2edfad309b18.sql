-- Fix the infinite recursion in RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

-- Create corrected policies without recursion
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Also fix the messages policy to be more direct
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Create simpler message policies
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);
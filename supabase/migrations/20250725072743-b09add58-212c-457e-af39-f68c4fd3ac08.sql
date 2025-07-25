-- Fix conversation participants RLS policy to allow proper conversation creation
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create proper policies for conversation participants
CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants FOR SELECT 
TO authenticated
USING (true);
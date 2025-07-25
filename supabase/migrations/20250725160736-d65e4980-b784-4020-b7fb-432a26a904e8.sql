-- Fix conversation RLS policies to allow proper conversation creation
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;

-- Create a better policy for conversation creation
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure participants can create conversations
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR auth.uid() IS NOT NULL)
);
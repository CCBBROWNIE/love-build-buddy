-- Fix RLS policies for conversations to allow proper chat functionality

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow users to update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow users to view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Create simple, working policies for conversations
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update conversations they participate in" 
ON public.conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Fix conversation_participants policies
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

CREATE POLICY "Authenticated users can add participants" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants 
FOR SELECT 
USING (true);

-- Make sure messages policies are working
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);
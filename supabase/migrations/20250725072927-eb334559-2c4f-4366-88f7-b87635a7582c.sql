-- Fix the conversation creation policy - the auth.role() check isn't working
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;

-- Create a simple policy that allows any authenticated user to create conversations
CREATE POLICY "Allow authenticated users to create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
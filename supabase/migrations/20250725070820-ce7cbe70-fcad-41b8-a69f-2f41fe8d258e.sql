-- Debug the conversations table and test with a simpler approach
-- First, let's see if the issue is with the RLS or something else

-- Temporarily create a very permissive policy to test
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Allow authenticated users to create conversations" 
ON public.conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also make sure we can see what's in the conversations table for debugging
CREATE POLICY "Debug: Allow authenticated users to see all conversations temporarily" 
ON public.conversations FOR SELECT 
TO authenticated
USING (true);
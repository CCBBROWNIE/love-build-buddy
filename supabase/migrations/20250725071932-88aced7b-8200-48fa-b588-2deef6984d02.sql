-- Temporarily disable RLS on conversations to test if the core logic works
-- This will help us isolate whether the issue is RLS or something else

ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
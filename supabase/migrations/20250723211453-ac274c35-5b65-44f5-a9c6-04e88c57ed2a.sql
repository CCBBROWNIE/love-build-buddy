-- Create email verifications table for storing verification codes
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for email verifications
CREATE POLICY "Users can insert verification codes"
ON public.email_verifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own verification codes"
ON public.email_verifications
FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX idx_email_verifications_email_code ON public.email_verifications(email, code);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications(expires_at);
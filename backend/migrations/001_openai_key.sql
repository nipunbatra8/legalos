-- Add OpenAI API key column to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS openai_api_key text;

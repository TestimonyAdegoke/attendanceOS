-- Add onboarding_completed and avatar_url fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing profiles to have onboarding_completed = true (they're already using the system)
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed IS NULL;

-- Add index for faster onboarding status checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

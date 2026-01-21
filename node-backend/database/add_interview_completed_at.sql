-- Optional: Add interview_completed_at column to track when interview finished
-- This is optional since we already removed the dependency in the code

USE niyuktisetu;

-- Add column if it doesn't exist
ALTER TABLE interview_verifications 
ADD COLUMN IF NOT EXISTS interview_completed_at TIMESTAMP NULL 
AFTER status;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_completed_at 
ON interview_verifications(interview_completed_at);

-- Show current structure
DESCRIBE interview_verifications;

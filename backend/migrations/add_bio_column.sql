-- Migration: Add bio column to student_profiles if it doesn't exist
-- This ensures students can edit their bio

DO $$ 
BEGIN
    -- Check if bio column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='student_profiles' 
        AND column_name='bio'
    ) THEN
        ALTER TABLE student_profiles 
        ADD COLUMN bio TEXT DEFAULT '';
        
        RAISE NOTICE 'Column bio added to student_profiles';
    ELSE
        RAISE NOTICE 'Column bio already exists in student_profiles';
    END IF;
END $$;

-- Update existing records to have empty string instead of NULL
UPDATE student_profiles 
SET bio = '' 
WHERE bio IS NULL;

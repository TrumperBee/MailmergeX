-- Add attachments column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Enable the column to be updated
-- This SQL adds the attachments field if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'attachments') THEN
    ALTER TABLE campaigns ADD COLUMN attachments JSONB DEFAULT '[]';
  END IF;
END $$;

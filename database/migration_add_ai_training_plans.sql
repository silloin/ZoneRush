-- Migration to enhance training_plans table for AI-generated plans
-- Add columns for AI-powered training plans

-- Add end_date column
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Add is_active column to track current plan
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add metadata column for AI-specific data (plan name, goal, tips, warnings, etc.)
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add generated_by column to distinguish AI vs template plans
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS generated_by VARCHAR(20) DEFAULT 'template'; -- 'ai' or 'template'

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_training_plans_active ON training_plans(user_id, is_active);

-- Create index for end date
CREATE INDEX IF NOT EXISTS idx_training_plans_end_date ON training_plans(end_date);

-- Update existing plans to be active
UPDATE training_plans SET is_active = true WHERE is_active IS NULL;

COMMENT ON COLUMN training_plans.end_date IS 'End date of the training plan';
COMMENT ON COLUMN training_plans.is_active IS 'Whether this is the currently active plan';
COMMENT ON COLUMN training_plans.metadata IS 'Additional metadata including AI-generated content (planName, goal, tips, warnings)';
COMMENT ON COLUMN training_plans.generated_by IS 'Source of plan generation: ai or template';

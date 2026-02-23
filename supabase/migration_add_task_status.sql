-- Migration: Replace is_completed boolean with status text field on tasks table
-- Status values: 'todo', 'in_progress', 'done'

-- Step 1: Add the new status column with default 'todo'
ALTER TABLE tasks ADD COLUMN status text NOT NULL DEFAULT 'todo';

-- Step 2: Migrate existing data
UPDATE tasks SET status = 'done' WHERE is_completed = true;
UPDATE tasks SET status = 'todo' WHERE is_completed = false;

-- Step 3: Drop the old is_completed column
ALTER TABLE tasks DROP COLUMN is_completed;

-- Step 4: Add CHECK constraint to enforce valid status values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done'));

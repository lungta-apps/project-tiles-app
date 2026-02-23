-- Migration: Add position field to tasks for drag-and-drop ordering
-- Position is a global 0-based integer per project (not per status column)

-- Step 1: Add nullable position column
ALTER TABLE tasks ADD COLUMN position integer;

-- Step 2: Populate based on created_at order within each project
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 AS pos
  FROM tasks
)
UPDATE tasks
SET position = ranked.pos
FROM ranked
WHERE tasks.id = ranked.id;

-- Step 3: Make NOT NULL with default 0
ALTER TABLE tasks ALTER COLUMN position SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN position SET DEFAULT 0;

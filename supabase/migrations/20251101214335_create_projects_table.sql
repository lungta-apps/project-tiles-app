/*
  # Create Projects Table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key) - Unique identifier for each project
      - `user_id` (uuid, nullable) - Foreign key for future user authentication
      - `name` (text) - Project name entered by user
      - `color` (text) - Hex color code for tile border
      - `position` (integer) - Position in grid (0-8 for 3x3 grid)
      - `created_at` (timestamptz) - Timestamp of project creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on `projects` table
    - Add policy for public access (temporary, until auth is implemented)

  3. Indexes
    - Index on position for efficient grid ordering
    - Index on user_id for future multi-user support

  4. Important Notes
    - Position field ensures projects maintain their grid placement
    - Color field stores hex values for customizable tile borders
    - user_id nullable to support current no-auth state
    - Schema designed for easy migration to authenticated users
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_position ON projects(position);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to projects"
  ON projects
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to projects"
  ON projects
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to projects"
  ON projects
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to projects"
  ON projects
  FOR DELETE
  TO public
  USING (true);

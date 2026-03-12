-- Remove duplicate project_title from teams; projects.title is the source of truth.
ALTER TABLE teams
DROP COLUMN IF EXISTS project_title;

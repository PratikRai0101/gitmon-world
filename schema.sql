-- Supabase/Postgres schema for Git-Mon World plots
CREATE TABLE IF NOT EXISTS plots (
  id SERIAL PRIMARY KEY,
  owner_username TEXT UNIQUE NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  building_type TEXT NOT NULL,
  top_language TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- index for quick spatial lookup by tile coordinates
CREATE INDEX IF NOT EXISTS idx_plots_xy ON plots (x, y);

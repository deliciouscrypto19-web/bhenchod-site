-- Bhenchod of the Week - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Weeks table
CREATE TABLE weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date date NOT NULL UNIQUE,
  image_url text NOT NULL,
  name text NOT NULL,
  upvotes int NOT NULL DEFAULT 0,
  downvotes int NOT NULL DEFAULT 0
);

-- Nominations table
CREATE TABLE nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RPC function to atomically increment votes
CREATE OR REPLACE FUNCTION increment_vote(week_id uuid, vote_type text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF vote_type = 'up' THEN
    UPDATE weeks SET upvotes = upvotes + 1 WHERE id = week_id;
  ELSIF vote_type = 'down' THEN
    UPDATE weeks SET downvotes = downvotes + 1 WHERE id = week_id;
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;

-- weeks: public read
CREATE POLICY "Public read on weeks"
  ON weeks FOR SELECT
  USING (true);

-- weeks: public can only update via RPC (no direct UPDATE allowed)
-- No UPDATE policy = no direct updates from the client

-- nominations: public insert only
CREATE POLICY "Public insert on nominations"
  ON nominations FOR INSERT
  WITH CHECK (true);

-- nominations: no public read (optional, keeps nominations private)
-- No SELECT policy = clients cannot read nominations

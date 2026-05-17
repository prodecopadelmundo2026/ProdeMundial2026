-- Add tiebreaker_team column to predictions for knockout matches with equal scores
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS tiebreaker_team text;

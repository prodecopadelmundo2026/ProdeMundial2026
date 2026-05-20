ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_home_score_range;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_home_score_range
  CHECK (home_score BETWEEN 0 AND 99) NOT VALID;

ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_away_score_range;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_away_score_range
  CHECK (away_score BETWEEN 0 AND 99) NOT VALID;

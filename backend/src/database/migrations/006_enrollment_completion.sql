-- Assessment completion records a timestamp when a trainee passes.
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

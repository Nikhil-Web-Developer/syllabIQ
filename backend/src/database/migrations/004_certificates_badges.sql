-- Migration 004: Certificates Public Verification & Gamification Badges

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_code VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);

-- Badges taxonomy
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(64) NOT NULL,
  criteria VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'milestone',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User awarded badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_user_badge UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

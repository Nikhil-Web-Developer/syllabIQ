-- =============================================================================
-- Migration 003: Performance Indexes for Dashboard Aggregate Queries
-- =============================================================================

-- 1. Enrollments composite index on enrolled_at and status
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at_status 
ON enrollments(enrolled_at, status);

-- 2. Certificates timestamp index
CREATE INDEX IF NOT EXISTS idx_certificates_created_at 
ON certificates(created_at DESC);

-- 3. Assessment attempts submitted_at and passed index
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_submitted_passed 
ON assessment_attempts(submitted_at, passed);

-- 4. User skills proficiency level index for skill-gap heatmaps
CREATE INDEX IF NOT EXISTS idx_user_skills_proficiency_skill 
ON user_skills(proficiency_level, skill_id);

-- 5. Users updated_at index for active user tracking
CREATE INDEX IF NOT EXISTS idx_users_updated_at 
ON users(updated_at DESC);

-- 6. Audit logs action and created_at composite index
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at 
ON audit_logs(action, created_at DESC);

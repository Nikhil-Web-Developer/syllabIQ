-- Migration 005: Enhanced Certificate System with PDF, Sharing, and Notifications

-- Enhance certificates table with more fields
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS question_bank_id UUID REFERENCES question_banks(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS assessment_attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_code VARCHAR(32) UNIQUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_file_url VARCHAR(1024);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revocation_reason TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create certificate_shares table for shareable links
CREATE TABLE IF NOT EXISTS certificate_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_certificate_shares_certificate_id ON certificate_shares(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_shares_share_token ON certificate_shares(share_token);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,  -- 'certificate_issued', 'course_passed', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_id UUID,  -- certificate_id or course_id
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(512),
    action_label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add some useful indexes for certificate lookups
CREATE INDEX IF NOT EXISTS idx_certificates_trainer_id ON certificates(trainer_id);
CREATE INDEX IF NOT EXISTS idx_certificates_question_bank_id ON certificates(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_certificates_assessment_attempt_id ON certificates(assessment_attempt_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_is_revoked ON certificates(is_revoked);
CREATE INDEX IF NOT EXISTS idx_certificates_course_trainer ON certificates(course_id, trainer_id);

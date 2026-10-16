-- =============================================================================
-- Migration 003: AI-Powered PDF-to-Quiz Generation & Draft Review
-- =============================================================================

-- 1. Add source tracking to live questions
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual';

-- 2. Add source document tracking to question banks
ALTER TABLE question_banks 
ADD COLUMN IF NOT EXISTS source_pdf_url VARCHAR(1024),
ADD COLUMN IF NOT EXISTS source_text TEXT;

-- 3. Create AI Draft Questions Table (holds candidate MCQs pending trainer review)
CREATE TABLE IF NOT EXISTS ai_draft_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option_id VARCHAR(255) NOT NULL,
    explanation TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'ai_generated',
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_draft_questions_bank ON ai_draft_questions(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_ai_draft_questions_status ON ai_draft_questions(status);

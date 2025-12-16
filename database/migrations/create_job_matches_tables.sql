-- Migration: Create Job Matches and Progress Tracking Tables
-- Purpose: Store background matching results and track progress
-- Date: 2025-12-12
--
-- This enables the automatic matching workflow:
-- 1. Job created → Background matching starts
-- 2. Results stored in job_matches
-- 3. Progress tracked in job_matching_progress
-- 4. UI displays matches in "Vagas" page

-- ============================================
-- JOB MATCHES TABLE
-- ============================================

-- Stores candidate match results for each job
-- Updated whenever background matching runs
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Scoring results
  composite_score numeric(5,2) NOT NULL CHECK (composite_score >= 0 AND composite_score <= 100),
  confidence_score numeric(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  success_probability numeric(5,2) CHECK (success_probability >= 0 AND success_probability <= 100),

  -- Match factors (stored as JSONB for flexibility)
  match_factors jsonb NOT NULL,
  -- Example structure:
  -- {
  --   "skillsMatch": 85,
  --   "experienceMatch": 90,
  --   "locationMatch": 100,
  --   "educationMatch": 80,
  --   "reliabilityScore": 95,
  --   "performanceScore": 88,
  --   "stabilityScore": 92,
  --   "growthPotential": 75
  -- }

  -- Semantic analysis (optional, from LLM)
  semantic_factors jsonb,
  -- Example structure:
  -- {
  --   "semanticScore": 87,
  --   "skillMatchScore": 85,
  --   "experienceFitScore": 90,
  --   "missingSkills": ["Docker", "Kubernetes"],
  --   "transferableSkills": ["React experience → Can learn Vue"],
  --   "reasoning": "Strong technical fit with 85% skill overlap..."
  -- }

  -- Recommendation
  recommendation varchar(50) NOT NULL CHECK (recommendation IN (
    'HIGHLY_RECOMMENDED',
    'RECOMMENDED',
    'CONSIDER',
    'NOT_RECOMMENDED'
  )),

  -- Reasoning/explanation (from LLM or rule-based)
  match_reasoning text,

  -- Timestamps
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  -- Ensure uniqueness: one match per job-candidate pair
  UNIQUE(job_id, candidate_id)
);

-- ============================================
-- JOB MATCHES INDEXES
-- ============================================

-- Primary query: Get all matches for a job, sorted by score
CREATE INDEX idx_job_matches_job_score
ON job_matches(job_id, composite_score DESC);

-- Query: Get all matches for a candidate
CREATE INDEX idx_job_matches_candidate
ON job_matches(candidate_id, created_at DESC);

-- Query: Find highly recommended matches for a job
CREATE INDEX idx_job_matches_recommendation
ON job_matches(job_id, recommendation)
WHERE recommendation IN ('HIGHLY_RECOMMENDED', 'RECOMMENDED');

-- Query: Time-based queries (recent matches)
CREATE INDEX idx_job_matches_created
ON job_matches(created_at DESC);

-- Full-text search on reasoning (if needed)
CREATE INDEX idx_job_matches_reasoning_gin
ON job_matches USING GIN(to_tsvector('portuguese', match_reasoning));

-- JSONB queries on match factors
CREATE INDEX idx_job_matches_factors_gin
ON job_matches USING GIN(match_factors);

CREATE INDEX idx_job_matches_semantic_gin
ON job_matches USING GIN(semantic_factors);

-- ============================================
-- JOB MATCHING PROGRESS TABLE
-- ============================================

-- Tracks progress of background matching for each job
-- One row per job, updated as matching progresses
CREATE TABLE IF NOT EXISTS job_matching_progress (
  job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,

  -- Status
  status varchar(20) NOT NULL CHECK (status IN (
    'pending',    -- Queued but not started
    'running',    -- Currently processing
    'completed',  -- Successfully completed
    'failed'      -- Failed with error
  )),

  -- Progress counters
  total_candidates integer NOT NULL DEFAULT 0 CHECK (total_candidates >= 0),
  processed_candidates integer NOT NULL DEFAULT 0 CHECK (processed_candidates >= 0 AND processed_candidates <= total_candidates),
  matches_found integer NOT NULL DEFAULT 0 CHECK (matches_found >= 0),

  -- Timestamps
  started_at timestamp,
  completed_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now(),

  -- Error tracking
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,

  -- Performance metrics
  processing_time_ms integer, -- Total time in milliseconds

  CONSTRAINT check_completed_at CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  ),

  CONSTRAINT check_error_message CHECK (
    (status = 'failed' AND error_message IS NOT NULL) OR
    (status != 'failed')
  )
);

-- ============================================
-- JOB MATCHING PROGRESS INDEXES
-- ============================================

-- Query: Get progress for active/running jobs
CREATE INDEX idx_job_matching_progress_status
ON job_matching_progress(status, updated_at DESC)
WHERE status IN ('pending', 'running');

-- Query: Get recently completed/failed jobs
CREATE INDEX idx_job_matching_progress_completed
ON job_matching_progress(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- Query: Monitor failed jobs
CREATE INDEX idx_job_matching_progress_failed
ON job_matching_progress(status, retry_count)
WHERE status = 'failed';

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp on job_matches
CREATE OR REPLACE FUNCTION update_job_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_matches_updated_at
BEFORE UPDATE ON job_matches
FOR EACH ROW
EXECUTE FUNCTION update_job_matches_updated_at();

-- Auto-update updated_at timestamp on job_matching_progress
CREATE OR REPLACE FUNCTION update_job_matching_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Auto-calculate processing time when completed
  IF NEW.status = 'completed' AND NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
    NEW.processing_time_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_matching_progress_updated_at
BEFORE UPDATE ON job_matching_progress
FOR EACH ROW
EXECUTE FUNCTION update_job_matching_progress_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to clean up old match results (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_job_matches(days_old integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM job_matches
  WHERE created_at < now() - (days_old || ' days')::interval
  AND job_id IN (
    SELECT id FROM jobs WHERE status IN ('closed', 'filled', 'cancelled')
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get top matches for a job
CREATE OR REPLACE FUNCTION get_top_matches(
  p_job_id uuid,
  p_limit integer DEFAULT 50,
  p_min_score numeric DEFAULT 50
)
RETURNS TABLE (
  candidate_id uuid,
  candidate_name text,
  composite_score numeric,
  confidence_score numeric,
  recommendation varchar,
  match_reasoning text,
  semantic_score numeric,
  created_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jm.candidate_id,
    c.full_name as candidate_name,
    jm.composite_score,
    jm.confidence_score,
    jm.recommendation,
    jm.match_reasoning,
    (jm.semantic_factors->>'semanticScore')::numeric as semantic_score,
    jm.created_at
  FROM job_matches jm
  JOIN candidates c ON c.id = jm.candidate_id
  WHERE jm.job_id = p_job_id
    AND jm.composite_score >= p_min_score
  ORDER BY jm.composite_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE ANALYSIS
-- ============================================

-- After creating tables, analyze for query optimization
ANALYZE job_matches;
ANALYZE job_matching_progress;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- To verify the tables were created correctly:
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('job_matches', 'job_matching_progress')
-- ORDER BY table_name, ordinal_position;

-- To check indexes:
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('job_matches', 'job_matching_progress')
-- ORDER BY tablename, indexname;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Insert match results (done by BackgroundMatchingService)
/*
INSERT INTO job_matches (
  job_id, candidate_id, composite_score, confidence_score,
  match_factors, recommendation
) VALUES (
  'job-uuid',
  'candidate-uuid',
  85.5,
  78.2,
  '{"skillsMatch": 85, "experienceMatch": 90}'::jsonb,
  'HIGHLY_RECOMMENDED'
) ON CONFLICT (job_id, candidate_id)
DO UPDATE SET
  composite_score = EXCLUDED.composite_score,
  confidence_score = EXCLUDED.confidence_score,
  match_factors = EXCLUDED.match_factors,
  recommendation = EXCLUDED.recommendation,
  updated_at = now();
*/

-- Example 2: Update matching progress
/*
INSERT INTO job_matching_progress (
  job_id, status, total_candidates, processed_candidates, matches_found
) VALUES (
  'job-uuid', 'running', 1000, 250, 47
) ON CONFLICT (job_id)
DO UPDATE SET
  status = EXCLUDED.status,
  processed_candidates = EXCLUDED.processed_candidates,
  matches_found = EXCLUDED.matches_found;
*/

-- Example 3: Get top matches for a job
/*
SELECT * FROM get_top_matches('job-uuid', 50, 70.0);
*/

-- Example 4: Get matching progress
/*
SELECT
  jp.job_id,
  j.title as job_title,
  jp.status,
  jp.processed_candidates,
  jp.total_candidates,
  ROUND((jp.processed_candidates::numeric / NULLIF(jp.total_candidates, 0)) * 100, 2) as progress_percent,
  jp.matches_found,
  jp.started_at,
  jp.completed_at,
  jp.processing_time_ms / 1000.0 as processing_time_seconds
FROM job_matching_progress jp
JOIN jobs j ON j.id = jp.job_id
WHERE jp.job_id = 'job-uuid';
*/

-- ============================================
-- MAINTENANCE NOTES
-- ============================================

-- Regular maintenance tasks:
-- 1. Clean up matches for old/closed jobs (monthly):
--    SELECT cleanup_old_job_matches(90);
--
-- 2. Vacuum and analyze (weekly):
--    VACUUM ANALYZE job_matches;
--    VACUUM ANALYZE job_matching_progress;
--
-- 3. Monitor table sizes:
--    SELECT
--      schemaname,
--      tablename,
--      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
--    FROM pg_tables
--    WHERE tablename IN ('job_matches', 'job_matching_progress')
--    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
--
-- 4. Monitor index usage:
--    SELECT * FROM pg_stat_user_indexes
--    WHERE schemaname = 'public'
--      AND relname IN ('job_matches', 'job_matching_progress')
--    ORDER BY idx_scan DESC;

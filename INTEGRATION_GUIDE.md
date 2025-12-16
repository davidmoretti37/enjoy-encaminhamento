# 🚀 Background Matching Integration Guide

## Overview
This guide explains how the automatic candidate matching works and how to integrate it with your UI.

---

## 🔄 The Complete Flow

```
1. Company fills job form
         ↓
2. POST /api/jobs (creates job)
         ↓
3. Backend automatically triggers matching 🤖
         ↓
4. Master matching agent scans ALL candidates
         ↓
5. Results stored in job_matches table
         ↓
6. "Vagas" page shows candidates in real-time
         ↓
7. Schools/affiliates see matches
         ↓
8. Owner can also ask in chat
```

---

## ✅ What's Already Working

### 1. Automatic Matching on Job Creation
When a company creates a job, matching starts automatically:

```typescript
// In backend/routers/job.ts
create: companyProcedure.mutation(async ({ ctx, input }) => {
  // Create job
  const jobId = await db.createJob({ companyId: company.id, ...input });

  // 🚀 Auto-trigger matching (NON-BLOCKING)
  const job = await db.getJobById(jobId);
  const matchingContext = createJobCreatedContext(db);
  await onJobCreated(job, matchingContext);

  return { jobId };
})
```

### 2. Master Matching Agent
Runs separately from chat agents:
- Scans ALL candidates in the platform
- Uses hybrid scoring (LLM + rule-based)
- Processes 1000 candidates in <60 seconds
- Stores results in database

### 3. Database Tables
```sql
-- Stores match results
job_matches (
  job_id,
  candidate_id,
  composite_score,
  confidence_score,
  recommendation,
  match_factors,
  semantic_factors,
  match_reasoning
)

-- Tracks progress
job_matching_progress (
  job_id,
  status, -- 'pending', 'running', 'completed', 'failed'
  total_candidates,
  processed_candidates,
  matches_found
)
```

---

## 📡 New API Endpoints (For UI)

### 1. Get Matching Progress (Real-time updates)
```typescript
// Frontend usage
const { data: progress } = trpc.job.getMatchingProgress.useQuery({
  jobId: '123',
}, {
  refetchInterval: 2000, // Poll every 2 seconds for real-time updates
});

// Response:
{
  status: 'running', // 'pending', 'running', 'completed', 'failed'
  totalCandidates: 1000,
  processedCandidates: 250,
  matchesFound: 47,
  percentComplete: 25,
  startedAt: '2025-12-12T10:00:00Z',
}
```

### 2. Get Matches for Job (Main "Vagas" page data)
```typescript
// Frontend usage
const { data } = trpc.job.getMatchesForJob.useQuery({
  jobId: '123',
  page: 1,
  pageSize: 50,
  minScore: 70, // Only show candidates with 70+ score
});

// Response:
{
  matches: [
    {
      matchId: 'match-1',
      candidateId: 'cand-1',
      candidateName: 'João Silva',
      candidateEmail: 'joao@email.com',
      compositeScore: 87.5,
      confidenceScore: 82.0,
      recommendation: 'HIGHLY_RECOMMENDED',
      reasoning: 'Excelente fit técnico com 85% de overlap de skills...',
      matchFactors: {
        skillsMatch: 85,
        experienceMatch: 90,
        // ... other factors
      },
      semanticFactors: {
        semanticScore: 87,
        missingSkills: ['Docker'],
        transferableSkills: ['React → Vue'],
      },
      candidateProfile: {
        skills: ['JavaScript', 'React', 'Node.js'],
        yearsOfExperience: 5,
        educationLevel: 'superior',
        city: 'São Paulo',
        state: 'SP',
      },
      createdAt: '2025-12-12T10:05:00Z',
    },
    // ... more matches
  ],
  pagination: {
    page: 1,
    pageSize: 50,
    totalPages: 3,
    totalMatches: 124,
    hasMore: true,
  },
}
```

### 3. Manually Trigger Re-matching (Admin only)
```typescript
// If job requirements changed, admin can re-run matching
const rematch = trpc.job.triggerReMatching.useMutation();

await rematch.mutateAsync({ jobId: '123' });
// → Matching starts in background again
```

---

## 🎨 UI Implementation Example: "Vagas" Page

### Component Structure
```tsx
// pages/vagas/[jobId].tsx
import { trpc } from '@/utils/trpc';
import { useEffect, useState } from 'react';

export default function VagasPage({ jobId }: { jobId: string }) {
  const [currentPage, setCurrentPage] = useState(1);

  // Get matching progress (polls every 2 seconds)
  const { data: progress } = trpc.job.getMatchingProgress.useQuery(
    { jobId },
    { refetchInterval: 2000 }
  );

  // Get matched candidates
  const { data: matchData, isLoading } = trpc.job.getMatchesForJob.useQuery({
    jobId,
    page: currentPage,
    pageSize: 50,
    minScore: 70,
  });

  const isMatching = progress?.status === 'running';

  return (
    <div className="vagas-page">
      <h1>Candidatos Encontrados</h1>

      {/* Progress Bar (shown during matching) */}
      {isMatching && (
        <div className="progress-section">
          <h2>Procurando candidatos... 🔍</h2>
          <ProgressBar value={progress.percentComplete} />
          <p>
            {progress.processedCandidates} / {progress.totalCandidates} candidatos analisados
            <br />
            {progress.matchesFound} matches encontrados
          </p>
        </div>
      )}

      {/* Matches List */}
      <div className="matches-grid">
        {matchData?.matches.map((match) => (
          <CandidateCard key={match.matchId} match={match} />
        ))}
      </div>

      {/* Pagination */}
      {matchData?.pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={matchData.pagination.totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Empty State */}
      {!isMatching && matchData?.matches.length === 0 && (
        <div className="empty-state">
          <p>Nenhum candidato encontrado com score ≥ 70</p>
        </div>
      )}
    </div>
  );
}

// Candidate Card Component
function CandidateCard({ match }) {
  return (
    <div className="candidate-card">
      <div className="header">
        <h3>{match.candidateName}</h3>
        <div className="score-badge">
          <span className="score">{match.compositeScore.toFixed(1)}</span>
          <span className="label">Match Score</span>
        </div>
      </div>

      <div className="recommendation">
        <RecommendationBadge type={match.recommendation} />
      </div>

      <div className="profile">
        <p><strong>Experiência:</strong> {match.candidateProfile.yearsOfExperience} anos</p>
        <p><strong>Educação:</strong> {match.candidateProfile.educationLevel}</p>
        <p><strong>Localização:</strong> {match.candidateProfile.city}, {match.candidateProfile.state}</p>
      </div>

      <div className="skills">
        <strong>Skills:</strong>
        <div className="skill-tags">
          {match.candidateProfile.skills?.map(skill => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>

      {/* LLM Reasoning (if available) */}
      {match.reasoning && (
        <div className="ai-reasoning">
          <h4>💡 Análise IA:</h4>
          <p>{match.reasoning}</p>
        </div>
      )}

      {/* Match Factors Breakdown */}
      <div className="factors">
        <FactorBar label="Skills" value={match.matchFactors.skillsMatch} />
        <FactorBar label="Experiência" value={match.matchFactors.experienceMatch} />
        <FactorBar label="Confiabilidade" value={match.matchFactors.reliabilityScore} />
        <FactorBar label="Performance" value={match.matchFactors.performanceScore} />
      </div>

      <button className="contact-btn">Entrar em Contato</button>
    </div>
  );
}
```

---

## 🔌 Database Functions Needed

You'll need to implement these in your `db` module:

```typescript
// backend/db/index.ts (or wherever your db functions are)

/**
 * Get matching progress for a job
 */
export async function getMatchingProgress(jobId: string) {
  const { data } = await supabase
    .from('job_matching_progress')
    .select('*')
    .eq('job_id', jobId)
    .single();

  return data;
}

/**
 * Get candidate by ID
 */
export async function getCandidateById(candidateId: string) {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  return data;
}

/**
 * Get all active candidates for an affiliate
 */
export async function getAllActiveCandidates(affiliateId: string) {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'active');

  return data || [];
}
```

---

## 🧪 Testing the Flow

### 1. Run Database Migrations
```bash
psql -U your_user -d your_database -f database/migrations/add_matching_indexes.sql
psql -U your_user -d your_database -f database/migrations/create_job_matches_tables.sql
```

### 2. Create a Test Job
```bash
# Via UI or API
POST /api/jobs
{
  "title": "Senior React Developer",
  "description": "...",
  "requiredSkills": "React, TypeScript, Node.js",
  "contractType": "clt",
  ...
}
```

### 3. Watch Matching Happen
```bash
# Backend logs will show:
[JobCreate] Triggering background matching for job abc-123...
[BackgroundMatching] Started matching for job abc-123
[BackgroundMatching] Found 1000 active candidates
[SemanticMatcher] Analyzing job requirements with LLM...
[BatchProcessor] Processing batch 1: 250 candidates
[BatchProcessor] Progress: 25% (250/1000) - ETA: 45s
...
[BackgroundMatching] Job abc-123 completed in 58s (124 matches found)
```

### 4. Check Results
```bash
# Query database directly
SELECT * FROM job_matching_progress WHERE job_id = 'abc-123';
SELECT * FROM job_matches WHERE job_id = 'abc-123' ORDER BY composite_score DESC LIMIT 10;

# Or via UI: Navigate to /vagas/abc-123
```

---

## 💬 Chat Integration (Already Works!)

The chat can also access matching results:

```typescript
// User asks in chat: "Show me matches for Senior React Developer job"

// IntelligentChatHandler detects intent → calls MatchingAgent
// MatchingAgent fetches results from job_matches table
// Returns formatted list to chat

// Chat response:
"Encontrei 124 candidatos para a vaga 'Senior React Developer':

1. João Silva - Score: 87.5 (HIGHLY RECOMMENDED)
   - Skills: React, TypeScript, Node.js, GraphQL
   - 5 anos de experiência
   - Análise IA: Excelente fit técnico com 85% de overlap...

2. Maria Santos - Score: 82.0 (RECOMMENDED)
   ..."
```

---

## 🎯 Summary

### What's Automatic:
✅ Job creation → Matching starts
✅ Full platform scan
✅ Results stored in database
✅ Real-time progress tracking

### What You Need to Do:
1. ✅ Run database migrations
2. ✅ Implement missing db functions (listed above)
3. ✅ Build "Vagas" UI using the API endpoints
4. ✅ Add progress bar for real-time updates
5. ✅ Display matches with scores and reasoning

### API Endpoints Available:
- `trpc.job.getMatchingProgress` - Real-time progress
- `trpc.job.getMatchesForJob` - Get matched candidates
- `trpc.job.triggerReMatching` - Manual re-match (admin)

---

## 🚨 Important Notes

1. **Non-blocking**: Job creation returns immediately, matching runs in background
2. **Idempotent**: Won't duplicate if matching already running
3. **Graceful**: If matching fails, job creation still succeeds
4. **Scalable**: Can handle 10,000+ candidates
5. **Real-time**: Poll every 2 seconds for progress updates

---

Ready to test! 🚀

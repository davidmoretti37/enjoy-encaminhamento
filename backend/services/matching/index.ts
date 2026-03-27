// @ts-nocheck
// Advanced AI Matching Pipeline Orchestrator
// 4-Stage matching: Vector Retrieval → Soft Scoring → Bidirectional → LLM Re-Ranking

import { supabaseAdmin } from '../../supabase';
import { getApplicantCandidateIds } from '../../db/applications';
import {
  calculateAllFactorsBatch,
  calculateDataCompleteness,
  batchFetchCandidateData,
} from './softScoring';
import {
  getWeightProfile,
  calculateCompositeScore,
  suggestWeightProfile,
  getAllWeightProfiles,
} from './weights';
import {
  reRankCandidatesBatch,
  filterForReRanking,
  preScreenCandidatesListwise,
} from './llmReranking';
import { generateExplanation } from './explainability';
import { initProgress, addMessage, completeProgress, failProgress } from './progress';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MatchingConfig {
  // Vector retrieval settings
  vectorRecallLimit?: number;
  vectorThreshold?: number;

  // Scoring settings
  weightProfile?: string;
  customWeights?: Partial<WeightConfig>;

  // LLM re-ranking settings
  enableLLMReranking?: boolean;
  llmRerankThreshold?: number;
  llmRerankLimit?: number;

  // Search settings
  useHybridSearch?: boolean;

  // Output settings
  includeExplanations?: boolean;
  limit?: number;
}

export interface MatchResult {
  candidateId: string;
  candidate: CandidateData;
  compositeScore: number;
  factors: FactorScores;
  llmResult?: LLMReRankResult;
  explanation?: MatchExplanation;
  finalScore: number;
  rank: number;
  applied?: boolean; // True if candidate applied directly to this job
}

export interface MatchingPipelineResult {
  jobId: string;
  totalCandidatesRetrieved: number;
  totalCandidatesScored: number;
  totalCandidatesReranked: number;
  weightProfile: string;
  results: MatchResult[];
  executionTimeMs: number;
  algorithmVersion: string;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: Required<MatchingConfig> = {
  vectorRecallLimit: 500,
  vectorThreshold: 0.2,
  weightProfile: 'balanced',
  customWeights: {},
  enableLLMReranking: true,
  llmRerankThreshold: 65,
  llmRerankLimit: 15,
  useHybridSearch: true,
  includeExplanations: true,
  limit: 50,
};

const ALGORITHM_VERSION = 'v3.0';

// ============================================
// STAGE 1: VECTOR RETRIEVAL
// ============================================

async function retrieveCandidatesBroad(
  jobId: string,
  options: { threshold: number; limit: number; useHybridSearch?: boolean }
): Promise<CandidateData[]> {
  const rpcName = options.useHybridSearch ? 'match_candidates_hybrid' : 'match_candidates_broad';
  const rpcParams: Record<string, any> = {
    job_id_input: jobId,
    match_threshold: options.threshold,
    match_count: options.limit,
  };

  const { data, error } = await supabaseAdmin.rpc(rpcName, rpcParams);

  if (error) {
    console.error('Vector retrieval error:', error);
    // Fall back to simple query without vector search
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('status', 'active')
      .limit(options.limit);

    if (fallbackError || !fallbackData) {
      console.error('Fallback query failed:', fallbackError);
      return [];
    }

    return fallbackData.map(c => ({
      ...c,
      skills: Array.isArray(c.skills) ? c.skills : [],
      languages: Array.isArray(c.languages) ? c.languages : [],
      experience: Array.isArray(c.experience) ? c.experience : [],
      semantic_similarity: 0.5, // Default similarity for fallback
    }));
  }

  return (data || []).map((c: any) => ({
    id: c.candidate_id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    state: c.state,
    education_level: c.education_level,
    skills: Array.isArray(c.skills) ? c.skills : [],
    languages: Array.isArray(c.languages) ? c.languages : [],
    experience: Array.isArray(c.experience) ? c.experience : [],
    summary: c.summary,
    disc_dominante: c.disc_dominante,
    disc_influente: c.disc_influente,
    disc_estavel: c.disc_estavel,
    disc_conforme: c.disc_conforme,
    pdp_top_10_competencies: Array.isArray(c.pdp_top_10_competencies || c.pdp_top10_competencies) ? (c.pdp_top_10_competencies || c.pdp_top10_competencies) : [],
    available_for_internship: c.available_for_internship,
    available_for_clt: c.available_for_clt,
    available_for_apprentice: c.available_for_apprentice,
    preferred_work_type: c.preferred_work_type,
    semantic_similarity: c.semantic_similarity,
  }));
}

// ============================================
// STAGE 2 & 3: SOFT SCORING + BIDIRECTIONAL
// ============================================

async function scoreCandidates(
  candidates: CandidateData[],
  job: JobData,
  weights: WeightConfig
): Promise<Array<{ candidate: CandidateData; factors: FactorScores; compositeScore: number }>> {
  const results: Array<{ candidate: CandidateData; factors: FactorScores; compositeScore: number }> = [];

  // Batch-fetch all candidate data upfront (3 queries instead of ~1,500)
  const candidateIds = candidates.map(c => c.id);
  const batchedData = await batchFetchCandidateData(candidateIds);

  // Process candidates in parallel batches
  const batchSize = 20;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const factors = await calculateAllFactorsBatch(candidate, job, batchedData);
        const compositeScore = calculateCompositeScore(factors, weights);
        return { candidate, factors, compositeScore };
      })
    );
    results.push(...batchResults);
  }

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore - a.compositeScore);

  return results;
}

// ============================================
// STAGE 4: LLM RE-RANKING
// ============================================

async function reRankTopCandidates(
  scoredCandidates: Array<{ candidate: CandidateData; factors: FactorScores; compositeScore: number }>,
  job: JobData,
  options: { threshold: number; limit: number }
): Promise<Map<string, LLMReRankResult>> {
  const candidatesForReRank: CandidateForReRank[] = scoredCandidates.map(sc => ({
    candidate: sc.candidate,
    factors: sc.factors,
    compositeScore: sc.compositeScore,
  }));

  // Get a broader pool for pre-screening (2x the limit)
  const preScreenLimit = Math.min(options.limit * 2, 30);
  const broadPool = filterForReRanking(candidatesForReRank, {
    minScore: options.threshold,
    maxCount: preScreenLimit,
  });

  if (broadPool.length === 0) {
    return new Map();
  }

  // If pool is small enough, skip pre-screening
  let finalCandidates = broadPool;
  if (broadPool.length > options.limit) {
    // Listwise pre-screening: 1 LLM call to pick the best candidates
    const selectedIds = await preScreenCandidatesListwise(broadPool, job, options.limit);
    const selectedSet = new Set(selectedIds);
    finalCandidates = broadPool.filter(c => selectedSet.has(c.candidate.id));

    // Fallback: if fewer than expected were selected, fill from top by score
    if (finalCandidates.length < options.limit) {
      const remaining = broadPool.filter(c => !selectedSet.has(c.candidate.id));
      finalCandidates.push(...remaining.slice(0, options.limit - finalCandidates.length));
    }
  }

  return await reRankCandidatesBatch(finalCandidates, job, {
    concurrency: 5,
    onProgress: (completed, total) => {
      console.log(`LLM re-ranking progress: ${completed}/${total}`);
    },
  });
}

// ============================================
// MAIN PIPELINE
// ============================================

export async function runMatchingPipeline(
  jobId: string,
  config: MatchingConfig = {}
): Promise<MatchingPipelineResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  initProgress(jobId);
  addMessage(jobId, 'Iniciando busca de candidatos...', 5);

  // Load job data with company info
  const { data: job, error: jobError } = await supabaseAdmin
    .from('jobs')
    .select('*, companies(company_name, summary, industry)')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const jobData: JobData = {
    id: job.id,
    title: job.title,
    description: job.description,
    contract_type: job.contract_type,
    work_type: job.work_type,
    location: job.location,
    salary: job.salary,
    salary_max: job.salary_max,
    min_education_level: job.min_education_level,
    required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
    required_languages: Array.isArray(job.required_languages) ? job.required_languages : [],
    min_age: job.min_age,
    max_age: job.max_age,
    experience_required: job.experience_required,
    min_experience_years: job.min_experience_years,
    notes: job.notes || undefined,
    company_name: (job.companies as any)?.company_name || undefined,
    company_summary: (job.companies as any)?.summary || undefined,
    company_industry: (job.companies as any)?.industry || undefined,
  };

  // Determine weight profile
  let weightProfileName = cfg.weightProfile;
  if (weightProfileName === 'auto') {
    weightProfileName = suggestWeightProfile(jobData);
  }
  const weightProfile = getWeightProfile(weightProfileName);
  const weights = Object.keys(cfg.customWeights || {}).length > 0
    ? { ...weightProfile.weights, ...cfg.customWeights } as WeightConfig
    : weightProfile.weights;

  // STAGE 1: Vector Retrieval
  console.log(`[Matching] Stage 1: Retrieving candidates for job ${jobId}`);
  addMessage(jobId, `Analisando a vaga "${jobData.title}" e buscando perfis compatíveis...`, 10);
  let candidates = await retrieveCandidatesBroad(jobId, {
    threshold: cfg.vectorThreshold,
    limit: cfg.vectorRecallLimit,
    useHybridSearch: cfg.useHybridSearch,
  });
  console.log(`[Matching] Retrieved ${candidates.length} candidates from vector search`);
  addMessage(jobId, `${candidates.length} perfis encontrados na base de dados. Analisando compatibilidade...`, 25);

  // Fetch candidates who applied directly to this job
  const applicantIds = await getApplicantCandidateIds(jobId);
  const applicantIdSet = new Set(applicantIds);
  console.log(`[Matching] Found ${applicantIds.length} candidates who applied directly`);

  // Merge applicants who weren't already retrieved
  if (applicantIds.length > 0) {
    const existingIds = new Set(candidates.map(c => c.id));
    const missingApplicantIds = applicantIds.filter(id => !existingIds.has(id));

    if (missingApplicantIds.length > 0) {
      console.log(`[Matching] Fetching ${missingApplicantIds.length} additional applicants not in vector results`);
      const { data: missingApplicants } = await supabaseAdmin
        .from('candidates')
        .select('*')
        .in('id', missingApplicantIds)
        .eq('status', 'active');

      if (missingApplicants && missingApplicants.length > 0) {
        const formattedApplicants = missingApplicants.map(c => ({
          ...c,
          skills: Array.isArray(c.skills) ? c.skills : [],
          languages: Array.isArray(c.languages) ? c.languages : [],
          experience: Array.isArray(c.experience) ? c.experience : [],
          semantic_similarity: 0.5, // Default similarity for applicants not in vector search
        }));
        candidates = [...candidates, ...formattedApplicants];
        console.log(`[Matching] Total candidates after merging applicants: ${candidates.length}`);
      }
    }
  }

  if (candidates.length === 0) {
    completeProgress(jobId, 0);
    return {
      jobId,
      totalCandidatesRetrieved: 0,
      totalCandidatesScored: 0,
      totalCandidatesReranked: 0,
      weightProfile: weightProfileName,
      results: [],
      executionTimeMs: Date.now() - startTime,
      algorithmVersion: ALGORITHM_VERSION,
    };
  }

  // STAGE 2 & 3: Soft Scoring + Bidirectional
  console.log(`[Matching] Stage 2-3: Scoring ${candidates.length} candidates`);
  addMessage(jobId, 'Avaliando habilidades, localização, experiência e perfil de cada candidato...', 35);
  const scoredCandidates = await scoreCandidates(candidates, jobData, weights);
  console.log(`[Matching] Scoring complete`);
  addMessage(jobId, `Pontuação concluída. Classificando os melhores perfis...`, 60);

  // Enrich top candidates with detailed PDP data before LLM stage
  const topCandidateIds = scoredCandidates
    .slice(0, cfg.llmRerankLimit + 5)
    .map(sc => sc.candidate.id);
  if (topCandidateIds.length > 0) {
    const { data: pdpData } = await supabaseAdmin
      .from('candidates')
      .select('id, pdp_intrapersonal, pdp_interpersonal, pdp_skills, pdp_competencies, pdp_develop_competencies')
      .in('id', topCandidateIds);
    if (pdpData) {
      const pdpMap = new Map(pdpData.map(p => [p.id, p]));
      for (const sc of scoredCandidates.slice(0, cfg.llmRerankLimit + 5)) {
        const pdp = pdpMap.get(sc.candidate.id);
        if (pdp) {
          sc.candidate.pdp_intrapersonal = pdp.pdp_intrapersonal;
          sc.candidate.pdp_interpersonal = pdp.pdp_interpersonal;
          sc.candidate.pdp_skills = pdp.pdp_skills;
          sc.candidate.pdp_competencies = pdp.pdp_competencies;
          sc.candidate.pdp_develop_competencies = pdp.pdp_develop_competencies;
        }
      }
    }
  }

  // STAGE 4: LLM Re-Ranking (optional)
  let llmResults = new Map<string, LLMReRankResult>();
  if (cfg.enableLLMReranking) {
    console.log(`[Matching] Stage 4: LLM re-ranking top candidates`);
    addMessage(jobId, 'A IA está analisando perfil DISC, competências PDP e observações da empresa...', 70);
    llmResults = await reRankTopCandidates(scoredCandidates, jobData, {
      threshold: cfg.llmRerankThreshold,
      limit: cfg.llmRerankLimit,
    });
    console.log(`[Matching] Re-ranked ${llmResults.size} candidates`);
    addMessage(jobId, `${llmResults.size} candidatos reavaliados pela IA com análise detalhada.`, 90);
  }

  // Build final results
  const results: MatchResult[] = scoredCandidates
    .slice(0, cfg.limit)
    .map((sc, index) => {
      const llmResult = llmResults.get(sc.candidate.id);

      // Final score is LLM-refined if available, otherwise composite
      const finalScore = llmResult?.refinedScore ?? sc.compositeScore;

      // Generate explanation if requested
      let explanation: MatchExplanation | undefined;
      if (cfg.includeExplanations) {
        explanation = generateExplanation(
          sc.candidate,
          jobData,
          sc.factors,
          weights,
          sc.compositeScore,
          llmResult
        );
      }

      return {
        candidateId: sc.candidate.id,
        candidate: sc.candidate,
        compositeScore: sc.compositeScore,
        factors: sc.factors,
        llmResult,
        explanation,
        finalScore,
        rank: index + 1,
        applied: applicantIdSet.has(sc.candidate.id), // Mark if candidate applied directly
      };
    });

  // Re-sort by final score after LLM re-ranking
  results.sort((a, b) => b.finalScore - a.finalScore);

  // Update ranks after re-sorting
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  const executionTimeMs = Date.now() - startTime;
  console.log(`[Matching] Pipeline complete in ${executionTimeMs}ms`);
  completeProgress(jobId, results.length);

  return {
    jobId,
    totalCandidatesRetrieved: candidates.length,
    totalCandidatesScored: scoredCandidates.length,
    totalCandidatesReranked: llmResults.size,
    weightProfile: weightProfileName,
    results,
    executionTimeMs,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

// ============================================
// PERSISTENCE
// ============================================

export async function saveMatchResults(
  jobId: string,
  results: MatchResult[],
  weightProfile: string
): Promise<void> {
  // Prepare records for upsert
  const records = results.map(r => ({
    job_id: jobId,
    candidate_id: r.candidateId,
    composite_score: r.compositeScore,
    semantic_score: r.factors.semantic,
    skills_score: r.factors.skills,
    location_score: r.factors.location,
    education_score: r.factors.education,
    experience_score: r.factors.experience,
    contract_score: r.factors.contract,
    personality_score: r.factors.personality,
    history_score: r.factors.history,
    bidirectional_score: r.factors.bidirectional,
    weight_profile: weightProfile,
    llm_refined_score: r.llmResult?.refinedScore || null,
    llm_confidence: r.llmResult?.confidence || null,
    llm_reasoning: r.llmResult?.reasoning || null,
    llm_recommendation: r.llmResult?.recommendation || null,
    llm_reranked_at: r.llmResult ? new Date().toISOString() : null,
    strengths: r.explanation?.strengths || [],
    opportunities: r.explanation?.opportunities || [],
    concerns: r.explanation?.concerns || [],
    explanation_summary: r.explanation?.summary || null,
    data_completeness: r.explanation?.dataCompleteness || null,
    disc_analysis: r.llmResult?.discAnalysis || null,
    competency_analysis: r.llmResult?.competencyAnalysis || null,
    company_fit_notes: r.llmResult?.companyFitNotes || null,
    full_analysis: r.llmResult?.fullAnalysis || null,
    competency_score: r.factors.competency || null,
    applied_to_job: r.applied || false,
    algorithm_version: ALGORITHM_VERSION,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabaseAdmin
      .from('job_matches')
      .upsert(batch, {
        onConflict: 'job_id,candidate_id',
      });

    if (error) {
      console.error('Error saving match results:', error);
    }
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

export async function getMatchResults(
  jobId: string,
  options: {
    limit?: number;
    minScore?: number;
    sortBy?: 'composite_score' | 'llm_refined_score' | 'semantic_score';
    includeExplanations?: boolean;
  } = {}
): Promise<MatchResult[]> {
  const {
    limit = 50,
    minScore = 0,
    sortBy = 'composite_score',
    includeExplanations = true,
  } = options;

  let query = supabaseAdmin
    .from('job_matches')
    .select(`
      *,
      candidates (
        id, full_name, email, phone, city, state,
        education_level, skills, languages, experience,
        disc_dominante, disc_influente, disc_estavel, disc_conforme,
        available_for_internship, available_for_clt, available_for_apprentice,
        preferred_work_type, summary
      )
    `)
    .eq('job_id', jobId)
    .gte('composite_score', minScore)
    .order(sortBy, { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching match results:', error);
    return [];
  }

  return data.map((row: any, index: number) => ({
    candidateId: row.candidate_id,
    candidate: {
      id: row.candidates.id,
      full_name: row.candidates.full_name,
      email: row.candidates.email,
      phone: row.candidates.phone,
      city: row.candidates.city,
      state: row.candidates.state,
      education_level: row.candidates.education_level,
      skills: row.candidates.skills || [],
      languages: row.candidates.languages || [],
      experience: row.candidates.experience || [],
      disc_dominante: row.candidates.disc_dominante,
      disc_influente: row.candidates.disc_influente,
      disc_estavel: row.candidates.disc_estavel,
      disc_conforme: row.candidates.disc_conforme,
      available_for_internship: row.candidates.available_for_internship,
      available_for_clt: row.candidates.available_for_clt,
      available_for_apprentice: row.candidates.available_for_apprentice,
      preferred_work_type: row.candidates.preferred_work_type,
      summary: row.candidates.summary,
    },
    compositeScore: row.composite_score,
    factors: {
      semantic: row.semantic_score,
      skills: row.skills_score,
      location: row.location_score,
      education: row.education_score,
      experience: row.experience_score,
      contract: row.contract_score,
      personality: row.personality_score,
      history: row.history_score,
      bidirectional: row.bidirectional_score,
    },
    llmResult: row.llm_refined_score ? {
      candidateId: row.candidate_id,
      refinedScore: row.llm_refined_score,
      confidence: row.llm_confidence,
      strengths: row.strengths || [],
      concerns: row.concerns || [],
      recommendation: row.llm_recommendation,
      reasoning: row.llm_reasoning,
    } : undefined,
    explanation: includeExplanations ? {
      summary: row.explanation_summary,
      compositeScore: row.composite_score,
      factors: [], // Not stored, would need to regenerate
      strengths: row.strengths || [],
      opportunities: row.opportunities || [],
      concerns: row.concerns || [],
      aiReasoning: row.llm_reasoning,
      confidence: row.llm_confidence || 70,
      dataCompleteness: row.data_completeness || 0,
      recommendation: row.llm_recommendation,
    } : undefined,
    finalScore: row.llm_refined_score || row.composite_score,
    rank: index + 1,
    applied: row.applied_to_job || false,
  }));
}

// ============================================
// EXPORTS
// ============================================

export {
  getWeightProfile,
  getAllWeightProfiles,
  suggestWeightProfile,
  generateExplanation,
};

export { getBriefExplanation, explanationToText } from './explainability';

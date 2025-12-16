/**
 * AI Candidate Matching Service
 * Uses LLM to score and analyze candidates against job requirements
 *
 * @deprecated This service is maintained for backward compatibility.
 * For new implementations, use the EnhancedMatchingAgent from '../agents'
 * which provides multi-factor weighted scoring, ensemble decision making,
 * and comprehensive analytics.
 *
 * Example:
 *   import { EnhancedMatchingAgent, createAgentContext } from '../agents';
 *   const agent = new EnhancedMatchingAgent();
 *   const context = createAgentContext(userId, affiliateId, {});
 *   const result = await agent.matchCandidatesAdvanced({ job, candidates }, context);
 */

import { invokeLLM } from "../_core/llm";
import { supabaseAdmin } from "../supabase";
import type { Database } from "../types/database";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

// Extended job type for queries with joins
type JobWithCompany = Job & {
  companies: { affiliate_id: string };
};

export type MatchRecommendation = 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';

export interface MatchResult {
  candidateId: string;
  matchScore: number;
  confidenceScore: number;
  recommendation: MatchRecommendation;
  strengths: string[];
  concerns: string[];
  matchExplanation: string;
}

export interface JobMatchRecord {
  id: string;
  job_id: string;
  candidate_id: string;
  affiliate_id: string;
  match_score: number;
  confidence_score: number;
  match_explanation: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  matched_at: string;
}

// Matching version for tracking AI prompt changes
const MATCHING_VERSION = 'v1.0-haiku';

/**
 * Build the LLM prompt for matching a candidate against a job
 */
function buildMatchingPrompt(job: Job, candidate: Candidate): string {
  // Format job data
  const jobData = {
    title: job.title,
    description: job.description,
    contract_type: job.contract_type,
    work_type: job.work_type,
    location: job.location,
    salary: job.salary,
    benefits: job.benefits,
    min_education_level: job.min_education_level,
    required_skills: job.required_skills,
    required_languages: job.required_languages,
    experience_required: job.experience_required,
    min_experience_years: job.min_experience_years,
    min_age: job.min_age,
    max_age: job.max_age,
    specific_requirements: job.specific_requirements,
  };

  // Format candidate data
  const candidateData = {
    full_name: candidate.full_name,
    education_level: candidate.education_level,
    currently_studying: candidate.currently_studying,
    institution: candidate.institution,
    course: candidate.course,
    skills: candidate.skills,
    languages: candidate.languages,
    experience: candidate.experience,
    has_work_experience: candidate.has_work_experience,
    city: candidate.city,
    state: candidate.state,
    date_of_birth: candidate.date_of_birth,
    available_for_internship: candidate.available_for_internship,
    available_for_clt: candidate.available_for_clt,
    available_for_apprentice: candidate.available_for_apprentice,
    preferred_work_type: candidate.preferred_work_type,
    profile_summary: candidate.profile_summary,
    general_knowledge_score: candidate.general_knowledge_score,
  };

  return `Você é um recrutador especialista analisando a compatibilidade entre candidato e vaga no mercado brasileiro.

## Requisitos da Vaga:
${JSON.stringify(jobData, null, 2)}

## Perfil do Candidato:
${JSON.stringify(candidateData, null, 2)}

Analise o quanto este candidato é compatível com os requisitos da vaga.

Retorne um objeto JSON com:
- match_score: número de 0 a 100 indicando compatibilidade geral
- confidence_score: número de 0 a 100 indicando sua confiança nesta avaliação
- recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended"
- strengths: array de 2 a 4 pontos fortes que fazem o candidato adequado
- concerns: array de 0 a 3 pontos de atenção ou lacunas
- match_explanation: resumo de 1-2 frases em português explicando a avaliação

Considere:
- Compatibilidade de habilidades (exatas e relacionadas)
- Nível de escolaridade (requisito mínimo atendido?)
- Relevância da experiência
- Compatibilidade de localização
- Preferências de tipo de trabalho
- Tipo de contrato (CLT, estágio, menor aprendiz) vs disponibilidade do candidato
- Idade do candidato vs requisitos da vaga

Responda APENAS com o JSON, sem texto adicional.`;
}

/**
 * Parse and validate LLM response
 */
function parseLLMResponse(content: string): MatchResult | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (
      typeof parsed.match_score !== 'number' ||
      typeof parsed.confidence_score !== 'number' ||
      !['highly_recommended', 'recommended', 'consider', 'not_recommended'].includes(parsed.recommendation) ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.concerns) ||
      typeof parsed.match_explanation !== 'string'
    ) {
      console.error('[Matching] Invalid response structure:', parsed);
      return null;
    }

    return {
      candidateId: '', // Will be set by caller
      matchScore: Math.min(100, Math.max(0, Math.round(parsed.match_score))),
      confidenceScore: Math.min(100, Math.max(0, Math.round(parsed.confidence_score))),
      recommendation: parsed.recommendation as MatchRecommendation,
      strengths: parsed.strengths.slice(0, 4),
      concerns: parsed.concerns.slice(0, 3),
      matchExplanation: parsed.match_explanation,
    };
  } catch (error) {
    console.error('[Matching] Failed to parse LLM response:', error);
    console.error('[Matching] Raw content:', content);
    return null;
  }
}

/**
 * Match a single candidate against a job using LLM
 */
async function matchSingleCandidate(job: Job, candidate: Candidate): Promise<MatchResult | null> {
  const prompt = buildMatchingPrompt(job, candidate);

  try {
    const result = await invokeLLM({
      messages: [
        { role: 'user', content: prompt }
      ],
      responseFormat: { type: 'json_object' },
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.error('[Matching] No content in LLM response');
      return null;
    }

    const match = parseLLMResponse(content);
    if (match) {
      match.candidateId = candidate.id;
    }
    return match;
  } catch (error) {
    console.error(`[Matching] Error matching candidate ${candidate.id}:`, error);
    return null;
  }
}

/**
 * Get eligible candidates for a job based on basic filters
 */
async function getEligibleCandidates(job: Job): Promise<Candidate[]> {
  let query = supabaseAdmin
    .from('candidates')
    .select('*')
    .eq('status', 'active');

  // Filter by contract type availability
  if (job.contract_type === 'clt') {
    query = query.eq('available_for_clt', true);
  } else if (job.contract_type === 'estagio') {
    query = query.eq('available_for_internship', true);
  } else if (job.contract_type === 'menor-aprendiz') {
    query = query.eq('available_for_apprentice', true);
  }

  // Optionally filter by location (same state)
  if (job.location) {
    // Extract state from location if possible
    const stateMatch = job.location.match(/\b([A-Z]{2})\b/);
    if (stateMatch) {
      query = query.eq('state', stateMatch[1]);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Matching] Error fetching candidates:', error);
    return [];
  }

  return data || [];
}

/**
 * Save match results to the database
 */
async function saveMatchResults(
  jobId: string,
  affiliateId: string,
  results: MatchResult[]
): Promise<void> {
  type JobMatchInsert = Database["public"]["Tables"]["job_matches"]["Insert"];

  const records: JobMatchInsert[] = results.map((r) => ({
    job_id: jobId,
    candidate_id: r.candidateId,
    franchise_id: affiliateId, // Note: column is still named franchise_id in DB
    match_score: r.matchScore,
    confidence_score: r.confidenceScore,
    match_explanation: r.matchExplanation,
    strengths: r.strengths as unknown as Database["public"]["Tables"]["job_matches"]["Insert"]["strengths"],
    concerns: r.concerns as unknown as Database["public"]["Tables"]["job_matches"]["Insert"]["concerns"],
    recommendation: r.recommendation,
    matching_version: MATCHING_VERSION,
  }));

  // Use upsert to handle re-matching
  // Type assertion needed due to Supabase's complex generic inference
  const { error } = await supabaseAdmin
    .from("job_matches")
    .upsert(records as never, {
      onConflict: "job_id,candidate_id",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('[Matching] Error saving matches:', error);
    throw error;
  }
}

/**
 * Main function: Find and match candidates for a job
 * Returns sorted matches by score (highest first)
 */
export async function matchCandidatesForJob(
  jobId: string,
  options?: {
    maxCandidates?: number;
    saveResults?: boolean;
  }
): Promise<MatchResult[]> {
  const { maxCandidates = 50, saveResults = true } = options || {};

  // 1. Get the job
  const { data: jobData, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("*, companies!inner(affiliate_id)")
    .eq("id", jobId)
    .single();

  if (jobError || !jobData) {
    console.error("[Matching] Job not found:", jobId);
    throw new Error("Job not found");
  }

  // Cast to proper type for the joined query
  const job = jobData as unknown as JobWithCompany;
  const affiliateId = job.companies.affiliate_id;
  if (!affiliateId) {
    throw new Error('Job company has no affiliate');
  }

  // 2. Get eligible candidates
  const candidates = await getEligibleCandidates(job);
  console.log(`[Matching] Found ${candidates.length} eligible candidates for job ${jobId}`);

  if (candidates.length === 0) {
    return [];
  }

  // Limit number of candidates to process
  const candidatesToProcess = candidates.slice(0, maxCandidates);

  // 3. Match each candidate (in parallel, with rate limiting)
  const BATCH_SIZE = 5;
  const results: MatchResult[] = [];

  for (let i = 0; i < candidatesToProcess.length; i += BATCH_SIZE) {
    const batch = candidatesToProcess.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(c => matchSingleCandidate(job, c));
    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result) {
        results.push(result);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < candidatesToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Matching] Successfully matched ${results.length} candidates`);

  // 4. Sort by match score (highest first)
  results.sort((a, b) => b.matchScore - a.matchScore);

  // 5. Save results if requested
  if (saveResults && results.length > 0) {
    await saveMatchResults(jobId, affiliateId, results);
  }

  return results;
}

/**
 * Get existing matches for a job
 */
export async function getMatchesForJob(jobId: string): Promise<JobMatchRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('job_matches')
    .select(`
      id,
      job_id,
      candidate_id,
      affiliate_id,
      match_score,
      confidence_score,
      match_explanation,
      strengths,
      concerns,
      recommendation,
      matched_at,
      candidates (
        id,
        full_name,
        email,
        city,
        state,
        education_level,
        skills,
        photo_url
      )
    `)
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (error) {
    console.error('[Matching] Error fetching matches:', error);
    throw error;
  }

  return (data || []) as unknown as JobMatchRecord[];
}

/**
 * Delete all matches for a job (for re-matching)
 */
export async function deleteMatchesForJob(jobId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('job_matches')
    .delete()
    .eq('job_id', jobId);

  if (error) {
    console.error('[Matching] Error deleting matches:', error);
    throw error;
  }
}

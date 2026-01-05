// @ts-nocheck
// Matching Service - Vector similarity search for candidates and jobs
import { supabaseAdmin } from '../supabase';
import { generateEmbedding, formatEmbeddingForPostgres } from './ai/embeddings';

export interface CandidateMatch {
  candidate_id: string;
  full_name: string;
  city: string;
  state: string;
  education_level: string;
  skills: string[];
  summary: string;
  similarity: number;
}

export interface JobMatch {
  job_id: string;
  title: string;
  description: string;
  contract_type: string;
  work_type: string;
  location: string;
  summary: string;
  similarity: number;
}

// Generate and store embedding for a candidate
export async function generateCandidateEmbedding(candidateId: string): Promise<boolean> {
  try {
    // Get candidate summary
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('summary')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate?.summary) {
      console.warn(`No summary found for candidate ${candidateId}`);
      return false;
    }

    // Generate embedding
    const embedding = await generateEmbedding(candidate.summary);
    if (!embedding) {
      console.warn(`Failed to generate embedding for candidate ${candidateId}`);
      return false;
    }

    // Store embedding
    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({ embedding: formatEmbeddingForPostgres(embedding) })
      .eq('id', candidateId);

    if (updateError) {
      console.error(`Failed to store embedding for candidate ${candidateId}:`, updateError);
      return false;
    }

    console.log(`Generated embedding for candidate ${candidateId}`);
    return true;
  } catch (error) {
    console.error(`Error generating candidate embedding:`, error);
    return false;
  }
}

// Generate and store embedding for a job
export async function generateJobEmbedding(jobId: string | number): Promise<boolean> {
  try {
    // Get job summary
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('summary')
      .eq('id', jobId)
      .single();

    if (fetchError || !job?.summary) {
      console.warn(`No summary found for job ${jobId}`);
      return false;
    }

    // Generate embedding
    const embedding = await generateEmbedding(job.summary);
    if (!embedding) {
      console.warn(`Failed to generate embedding for job ${jobId}`);
      return false;
    }

    // Store embedding
    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ embedding: formatEmbeddingForPostgres(embedding) })
      .eq('id', jobId);

    if (updateError) {
      console.error(`Failed to store embedding for job ${jobId}:`, updateError);
      return false;
    }

    console.log(`Generated embedding for job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`Error generating job embedding:`, error);
    return false;
  }
}

// Find matching candidates for a job using vector similarity
export async function findMatchingCandidates(
  jobId: string,
  options: {
    threshold?: number;
    limit?: number;
  } = {}
): Promise<CandidateMatch[]> {
  const { threshold = 0.5, limit = 50 } = options;

  try {
    const { data, error } = await supabaseAdmin
      .rpc('match_candidates_for_job', {
        job_id_input: jobId,
        match_threshold: threshold,
        match_count: limit,
      });

    if (error) {
      console.error('Error finding matching candidates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in findMatchingCandidates:', error);
    return [];
  }
}

// Find matching jobs for a candidate using vector similarity
export async function findMatchingJobs(
  candidateId: string,
  options: {
    threshold?: number;
    limit?: number;
  } = {}
): Promise<JobMatch[]> {
  const { threshold = 0.5, limit = 20 } = options;

  try {
    const { data, error } = await supabaseAdmin
      .rpc('match_jobs_for_candidate', {
        candidate_id_input: candidateId,
        match_threshold: threshold,
        match_count: limit,
      });

    if (error) {
      console.error('Error finding matching jobs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in findMatchingJobs:', error);
    return [];
  }
}

// Direct vector similarity query (alternative to RPC functions)
export async function findSimilarCandidatesRaw(
  jobId: string,
  limit: number = 50
): Promise<CandidateMatch[]> {
  try {
    // Get job embedding
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('embedding')
      .eq('id', jobId)
      .single();

    if (jobError || !job?.embedding) {
      console.warn(`No embedding found for job ${jobId}`);
      return [];
    }

    // Query candidates with similarity
    const { data, error } = await supabaseAdmin
      .rpc('match_candidates_for_job', {
        job_id_input: jobId,
        match_threshold: 0.3,
        match_count: limit,
      });

    if (error) {
      console.error('Error in raw similarity query:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in findSimilarCandidatesRaw:', error);
    return [];
  }
}

/**
 * Job Created Event Handler
 *
 * Automatically triggers background matching when a job is created.
 *
 * Flow:
 * 1. Job created via POST /api/jobs
 * 2. onJobCreated() called with job data
 * 3. BackgroundMatchingService.startMatching() initiated
 * 4. Returns immediately (non-blocking)
 * 5. Matching runs in background
 * 6. Results stored in job_matches table
 *
 * Usage:
 * import { onJobCreated } from './events/jobCreated';
 *
 * // In job creation endpoint:
 * const newJob = await createJob(data);
 * await onJobCreated(newJob, context); // Triggers background matching
 */

import { getBackgroundMatchingService } from '../services/BackgroundMatchingService';

interface Job {
  id: string;
  title: string;
  description?: string;
  requiredSkills?: string[];
  minExperienceYears?: number;
  minEducationLevel?: string;
  contractType?: string;
  workType?: string;
  location?: {
    city?: string;
    state?: string;
  };
  salary?: number;
  benefits?: string[];
  affiliate_id?: string;
  school_id?: string;
  company_id?: string;
  status: string;
  createdAt?: Date;
}

interface Candidate {
  id: string;
  fullName: string;
  email?: string;
  skills?: string[];
  yearsOfExperience?: number;
  educationLevel?: string;
  city?: string;
  state?: string;
  status?: string;
  availableForClt?: boolean;
  availableForInternship?: boolean;
  availableForApprentice?: boolean;
  availableForRemote?: boolean;
}

interface ScoredCandidate {
  candidateId: string;
  candidateName: string;
  compositeScore: number;
  confidenceScore: number;
  successProbability?: number;
  factors: any;
  recommendation: string;
  semanticScore?: number;
  semanticReasoning?: string;
  missingSkills?: string[];
  transferableSkills?: string[];
}

interface MatchingProgress {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalCandidates: number;
  processedCandidates: number;
  matchesFound: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Database context interface
 * Provides access to database operations needed by BackgroundMatchingService
 */
export interface JobCreatedContext {
  /**
   * Get job by ID
   */
  getJob(jobId: string): Promise<Job>;

  /**
   * Get all active candidates for a school
   */
  getAllActiveCandidates(schoolId: string): Promise<Candidate[]>;

  /**
   * Store match results in database
   */
  storeMatchResults(jobId: string, matches: ScoredCandidate[]): Promise<void>;

  /**
   * Update matching progress
   */
  updateProgress(progress: MatchingProgress): Promise<void>;

  /**
   * Get candidate history (contracts)
   */
  getCandidateContracts(candidateId: string): Promise<any[]>;

  /**
   * Get candidate history (feedback)
   */
  getCandidateFeedback(candidateId: string): Promise<any[]>;

  /**
   * Get candidate history (interviews)
   */
  getCandidateInterviews(candidateId: string): Promise<any[]>;

  /**
   * Get candidate history (applications)
   */
  getCandidateApplications(candidateId: string): Promise<any[]>;
}

/**
 * Event handler: Job created
 *
 * Triggers background matching for the newly created job.
 * Non-blocking - returns immediately.
 *
 * @param job - The newly created job
 * @param context - Database context for querying candidates and storing results
 * @returns Promise<void> - Resolves when matching is initiated (not completed!)
 */
export async function onJobCreated(job: Job, context: JobCreatedContext): Promise<void> {
  const logger = console;

  try {
    // Only trigger matching for open jobs
    if (job.status !== 'open') {
      logger.log(`[JobCreated] Job ${job.id} is not open, skipping background matching`);
      return;
    }

    logger.log(`[JobCreated] Job created: ${job.title} (${job.id})`);
    logger.log(`[JobCreated] Initiating background matching for school ${job.school_id}...`);

    // Get background matching service
    const matchingService = getBackgroundMatchingService();

    // Start matching (non-blocking - returns immediately)
    await matchingService.startMatching(job.id, context);

    logger.log(`[JobCreated] Background matching initiated for job ${job.id}`);
    logger.log(`[JobCreated] Matching will run in background. Check progress at GET /api/matches/${job.id}/progress`);
  } catch (error) {
    // Log error but don't fail job creation
    logger.error(`[JobCreated] Failed to initiate background matching for job ${job.id}:`, error);
    logger.warn(`[JobCreated] Job ${job.id} was created successfully, but matching must be triggered manually`);
  }
}

/**
 * Hook function to integrate with existing job creation flow
 *
 * Call this after job creation to trigger automatic matching.
 *
 * Example usage in tRPC router:
 *
 * ```typescript
 * import { onJobCreated } from '../../events/jobCreated';
 * import { createJobCreatedContext } from '../../events/jobCreated';
 *
 * export const jobRouter = router({
 *   create: protectedProcedure
 *     .input(jobSchema)
 *     .mutation(async ({ input, ctx }) => {
 *       // Create job in database
 *       const newJob = await db.jobs.create(input);
 *
 *       // Trigger background matching
 *       const eventContext = createJobCreatedContext(ctx.db);
 *       await onJobCreated(newJob, eventContext);
 *
 *       return newJob;
 *     }),
 * });
 * ```
 */

/**
 * Helper: Create context from database client
 *
 * This is a factory function that creates the context object needed by onJobCreated.
 * Adapt this to your specific database client (Supabase, Prisma, etc.)
 *
 * @param db - Your database client
 * @returns JobCreatedContext - Context object for onJobCreated
 */
export function createJobCreatedContext(db: any): JobCreatedContext {
  return {
    async getJob(jobId: string): Promise<Job> {
      return db.getJobById(jobId);
    },

    async getAllActiveCandidates(schoolId: string): Promise<Candidate[]> {
      return db.getAllActiveCandidatesBySchool(schoolId);
    },

    async storeMatchResults(jobId: string, matches: ScoredCandidate[]): Promise<void> {
      return db.storeMatchResults(jobId, matches);
    },

    async updateProgress(progress: MatchingProgress): Promise<void> {
      return db.updateMatchingProgress(progress);
    },

    async getCandidateContracts(candidateId: string): Promise<any[]> {
      return db.getCandidateContracts(candidateId);
    },

    async getCandidateFeedback(candidateId: string): Promise<any[]> {
      return db.getCandidateFeedback(candidateId);
    },

    async getCandidateInterviews(candidateId: string): Promise<any[]> {
      return db.getCandidateInterviews(candidateId);
    },

    async getCandidateApplications(candidateId: string): Promise<any[]> {
      return db.getCandidateApplications(candidateId);
    },
  };
}

/**
 * Event handler: Job updated
 *
 * Re-triggers matching when job requirements change significantly.
 * Only triggers if meaningful fields changed (skills, experience, etc.)
 */
export async function onJobUpdated(
  oldJob: Job,
  newJob: Job,
  context: JobCreatedContext
): Promise<void> {
  const logger = console;

  // Check if meaningful fields changed
  const meaningfulFieldsChanged =
    JSON.stringify(oldJob.requiredSkills) !== JSON.stringify(newJob.requiredSkills) ||
    oldJob.minExperienceYears !== newJob.minExperienceYears ||
    oldJob.minEducationLevel !== newJob.minEducationLevel ||
    oldJob.contractType !== newJob.contractType ||
    oldJob.workType !== newJob.workType ||
    JSON.stringify(oldJob.location) !== JSON.stringify(newJob.location);

  if (!meaningfulFieldsChanged) {
    logger.log(`[JobUpdated] Job ${newJob.id} updated but requirements unchanged, skipping re-matching`);
    return;
  }

  logger.log(`[JobUpdated] Job ${newJob.id} requirements changed, re-triggering matching...`);

  // Trigger matching just like job creation
  await onJobCreated(newJob, context);
}

/**
 * Event handler: Job status changed to active
 *
 * Triggers matching when a draft job is published/activated.
 */
export async function onJobActivated(job: Job, context: JobCreatedContext): Promise<void> {
  const logger = console;

  if (job.status !== 'open') {
    logger.warn(`[JobActivated] Job ${job.id} is not open, cannot activate`);
    return;
  }

  logger.log(`[JobActivated] Job ${job.id} activated, triggering matching...`);

  // Trigger matching
  await onJobCreated(job, context);
}

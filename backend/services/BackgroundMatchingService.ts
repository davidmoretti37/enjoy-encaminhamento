/**
 * Background Matching Service
 *
 * Automatically matches candidates to jobs when a job is created.
 * Runs in the background, stores results in database, emits progress events.
 *
 * Flow:
 * 1. Job created → onJobCreated() event
 * 2. startMatching() → Fetch all active candidates
 * 3. Process in batches → Use EnhancedMatchingAgent
 * 4. Store results → job_matches table
 * 5. Emit progress → Real-time updates
 * 6. Complete → Update job_matching_progress
 *
 * Features:
 * - Non-blocking (returns immediately, runs async)
 * - Progress tracking with real-time updates
 * - Error handling and retry logic
 * - Graceful degradation
 * - Duplicate prevention (idempotent)
 */

import { EnhancedMatchingAgent } from '../agents/agents/MatchingAgent';
import { TimeoutWrapper } from '../agents/utils/TimeoutWrapper';
import { RetryPolicy } from '../agents/utils/RetryPolicy';
import { CircuitBreakerRegistry } from '../agents/utils/CircuitBreaker';
import { DatabaseError } from '../agents/utils/AgentErrors';

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

interface BackgroundMatchingContext {
  getJob(jobId: string): Promise<Job>;
  getAllActiveCandidates(schoolId: string): Promise<Candidate[]>;
  storeMatchResults(jobId: string, matches: ScoredCandidate[]): Promise<void>;
  updateProgress(progress: MatchingProgress): Promise<void>;
  getCandidateContracts(candidateId: string): Promise<any[]>;
  getCandidateFeedback(candidateId: string): Promise<any[]>;
  getCandidateInterviews(candidateId: string): Promise<any[]>;
  getCandidateApplications(candidateId: string): Promise<any[]>;
}

export class BackgroundMatchingService {
  private matchingAgent: EnhancedMatchingAgent;
  private retryPolicy: RetryPolicy;
  private circuitBreaker = CircuitBreakerRegistry.getInstance().getBreaker('BackgroundMatching', {
    failureThreshold: 3,
    timeout: 120000,
    onStateChange: (oldState, newState) => {
      console.log(`[BackgroundMatching] Circuit breaker: ${oldState} → ${newState}`);
    },
  });

  private logger: Console;

  // Track running jobs to prevent duplicates
  private runningJobs = new Set<string>();

  constructor(logger?: Console) {
    this.logger = logger || console;
    this.matchingAgent = new EnhancedMatchingAgent({ logger: this.logger });
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      logger: this.logger,
    });
  }

  /**
   * Start matching for a job (main entry point)
   * Non-blocking - returns immediately, runs in background
   *
   * @param jobId - Job to match candidates for
   * @param context - Database and business logic context
   */
  async startMatching(jobId: string, context: BackgroundMatchingContext): Promise<void> {
    // Check if already running
    if (this.runningJobs.has(jobId)) {
      this.logger.warn(`[BackgroundMatching] Job ${jobId} matching already in progress, skipping`);
      return;
    }

    // Mark as running
    this.runningJobs.add(jobId);

    // Run async (don't await)
    this.runMatching(jobId, context)
      .then(() => {
        this.logger.log(`[BackgroundMatching] Job ${jobId} matching completed successfully`);
      })
      .catch((error) => {
        this.logger.error(`[BackgroundMatching] Job ${jobId} matching failed:`, error);
      })
      .finally(() => {
        // Remove from running set
        this.runningJobs.delete(jobId);
      });

    this.logger.log(`[BackgroundMatching] Started matching for job ${jobId} (running in background)`);
  }

  /**
   * Main matching workflow
   * Runs in background, updates progress, stores results
   */
  private async runMatching(jobId: string, context: BackgroundMatchingContext): Promise<void> {
    const startTime = Date.now();

    try {
      // Initialize progress
      await context.updateProgress({
        jobId,
        status: 'running',
        totalCandidates: 0,
        processedCandidates: 0,
        matchesFound: 0,
        startedAt: new Date(),
      });

      // Fetch job details
      this.logger.log(`[BackgroundMatching] Fetching job details for ${jobId}`);
      const job = await this.retryPolicy.execute(() => context.getJob(jobId));

      if (job.status !== 'open') {
        this.logger.warn(`[BackgroundMatching] Job ${jobId} is not open, skipping matching`);
        await context.updateProgress({
          jobId,
          status: 'completed',
          totalCandidates: 0,
          processedCandidates: 0,
          matchesFound: 0,
          completedAt: new Date(),
        });
        return;
      }

      // Fetch all active candidates for this school
      this.logger.log(`[BackgroundMatching] Fetching active candidates for school ${job.school_id}`);
      const allCandidates = await this.retryPolicy.execute(() =>
        context.getAllActiveCandidates(job.school_id || '')
      );

      this.logger.log(`[BackgroundMatching] Found ${allCandidates.length} active candidates`);

      // Update progress with total
      await context.updateProgress({
        jobId,
        status: 'running',
        totalCandidates: allCandidates.length,
        processedCandidates: 0,
        matchesFound: 0,
      });

      // If no candidates, mark as complete
      if (allCandidates.length === 0) {
        await context.updateProgress({
          jobId,
          status: 'completed',
          totalCandidates: 0,
          processedCandidates: 0,
          matchesFound: 0,
          completedAt: new Date(),
        });
        return;
      }

      // Run matching with timeout (5 minutes max)
      const matchingResult = await TimeoutWrapper.execute(
        async () => {
          return this.matchingAgent.matchCandidatesAdvanced(
            { job, candidates: allCandidates },
            {
              ...context,
              userId: 'system',
              affiliateId: job.affiliateId,
              executionId: `bg-match-${jobId}`,
            },
            {
              maxCandidates: 10000, // Process all
              useSemanticMatching: true,
              page: 1,
              pageSize: allCandidates.length, // Get all results (no pagination for storage)
              onProgress: async (progress) => {
                // Update progress in real-time
                await context.updateProgress({
                  jobId,
                  status: 'running',
                  totalCandidates: progress.totalCandidates,
                  processedCandidates: progress.processedCandidates,
                  matchesFound: progress.matchesFound,
                }).catch((error) => {
                  // Don't fail matching if progress update fails
                  this.logger.error('[BackgroundMatching] Failed to update progress:', error);
                });
              },
            }
          );
        },
        300000, // 5 minutes
        `Matching for job ${jobId} timed out after 5 minutes`
      );

      // Check if matching succeeded
      if (!matchingResult.success) {
        throw new Error(`Matching failed: ${matchingResult.error}`);
      }

      const matches = matchingResult.data.matches;
      this.logger.log(`[BackgroundMatching] Found ${matches.length} matches for job ${jobId}`);

      // Store results in database
      if (matches.length > 0) {
        await this.retryPolicy.execute(() => context.storeMatchResults(jobId, matches));
        this.logger.log(`[BackgroundMatching] Stored ${matches.length} match results for job ${jobId}`);
      }

      // Mark as completed
      await context.updateProgress({
        jobId,
        status: 'completed',
        totalCandidates: allCandidates.length,
        processedCandidates: allCandidates.length,
        matchesFound: matches.length,
        completedAt: new Date(),
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `[BackgroundMatching] Job ${jobId} matching completed in ${Math.round(duration / 1000)}s ` +
          `(${matches.length} matches found from ${allCandidates.length} candidates)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[BackgroundMatching] Job ${jobId} matching failed:`, errorMessage);

      // Mark as failed
      await context.updateProgress({
        jobId,
        status: 'failed',
        totalCandidates: 0,
        processedCandidates: 0,
        matchesFound: 0,
        completedAt: new Date(),
        errorMessage,
      }).catch((progressError) => {
        this.logger.error('[BackgroundMatching] Failed to update progress on error:', progressError);
      });

      throw error;
    }
  }

  /**
   * Get matching progress for a job
   */
  async getProgress(jobId: string, context: BackgroundMatchingContext): Promise<MatchingProgress | null> {
    try {
      // This would query the job_matching_progress table
      // For now, we check if the job is currently running
      return {
        jobId,
        status: this.runningJobs.has(jobId) ? 'running' : 'completed',
        totalCandidates: 0,
        processedCandidates: 0,
        matchesFound: 0,
      };
    } catch (error) {
      this.logger.error(`[BackgroundMatching] Failed to get progress for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Check if matching is running for a job
   */
  isRunning(jobId: string): boolean {
    return this.runningJobs.has(jobId);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      runningJobs: Array.from(this.runningJobs),
      circuitBreakerState: this.circuitBreaker.getState(),
      matchingAgentStats: this.matchingAgent.getStats(),
    };
  }
}

// Singleton instance
let backgroundMatchingServiceInstance: BackgroundMatchingService | null = null;

/**
 * Get global background matching service instance
 */
export function getBackgroundMatchingService(): BackgroundMatchingService {
  if (!backgroundMatchingServiceInstance) {
    backgroundMatchingServiceInstance = new BackgroundMatchingService();
  }
  return backgroundMatchingServiceInstance;
}

/**
 * Reset background matching service (for testing)
 */
export function resetBackgroundMatchingService(): void {
  backgroundMatchingServiceInstance = null;
}

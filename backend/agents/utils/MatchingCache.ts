/**
 * Matching Cache - Specialized caching for candidate matching
 *
 * Provides three levels of caching:
 * 1. Job Analysis Cache - Cache LLM job requirement extraction
 * 2. Candidate Factors Cache - Cache candidate scoring factors
 * 3. Semantic Match Cache - Cache LLM semantic matching results
 *
 * Memory footprint: ~4MB total
 * - 100 jobs × ~2KB = 200KB
 * - 5000 candidate factors × ~500B = 2.5MB
 * - 1000 semantic matches × ~1KB = 1MB
 */

import { LRUCache } from './LRUCache';

/**
 * Job requirements extracted by LLM
 */
export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  responsibilities: string[];
  domainKnowledge: string[];
}

/**
 * Match factors for a candidate
 */
export interface MatchFactors {
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  educationMatch: number;
  reliabilityScore: number;
  performanceScore: number;
  stabilityScore: number;
  growthPotential: number;
}

/**
 * Semantic match result from LLM
 */
export interface SemanticMatch {
  candidateIndex: number;
  skillMatchScore: number;
  experienceFitScore: number;
  missingSkills: string[];
  transferableSkills: string[];
  semanticScore: number;
  reasoning: string;
}

export class MatchingCache {
  private jobCache: LRUCache<string, JobRequirements>;
  private candidateFactorsCache: LRUCache<string, MatchFactors>;
  private semanticMatchCache: LRUCache<string, SemanticMatch>;

  constructor() {
    // Job analysis cache: 100 jobs, 24 hour TTL
    this.jobCache = new LRUCache<string, JobRequirements>({
      max: 100,
      ttl: 1000 * 60 * 60 * 24, // 24 hours
      updateAgeOnGet: true,
      onEvict: (key) => console.log(`[MatchingCache] Evicted job: ${key}`),
    });

    // Candidate factors cache: 5000 candidates, 1 hour TTL
    // (factors can change with new feedback/contracts)
    this.candidateFactorsCache = new LRUCache<string, MatchFactors>({
      max: 5000,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      onEvict: (key) => console.log(`[MatchingCache] Evicted candidate factors: ${key}`),
    });

    // Semantic match cache: 1000 matches, 30 minute TTL
    // Key format: `${jobId}_${candidateId}`
    this.semanticMatchCache = new LRUCache<string, SemanticMatch>({
      max: 1000,
      ttl: 1000 * 60 * 30, // 30 minutes
      updateAgeOnGet: false, // Don't update on get (stricter expiry)
      onEvict: (key) => console.log(`[MatchingCache] Evicted semantic match: ${key}`),
    });
  }

  // ============================================
  // Job Analysis Cache
  // ============================================

  /**
   * Get cached job analysis
   */
  getJobAnalysis(jobId: string): JobRequirements | null {
    return this.jobCache.get(jobId) || null;
  }

  /**
   * Set job analysis in cache
   */
  setJobAnalysis(jobId: string, analysis: JobRequirements): void {
    this.jobCache.set(jobId, analysis);
  }

  /**
   * Check if job analysis is cached
   */
  hasJobAnalysis(jobId: string): boolean {
    return this.jobCache.has(jobId);
  }

  /**
   * Invalidate job analysis (when job is updated)
   */
  invalidateJob(jobId: string): void {
    this.jobCache.delete(jobId);
    // Also invalidate all semantic matches for this job
    const keysToDelete: string[] = [];
    this.semanticMatchCache.forEach((_, key) => {
      if (key.startsWith(`${jobId}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.semanticMatchCache.delete(key));
  }

  // ============================================
  // Candidate Factors Cache
  // ============================================

  /**
   * Get cached candidate factors
   */
  getCandidateFactors(candidateId: string): MatchFactors | null {
    return this.candidateFactorsCache.get(candidateId) || null;
  }

  /**
   * Set candidate factors in cache
   */
  setCandidateFactors(candidateId: string, factors: MatchFactors): void {
    this.candidateFactorsCache.set(candidateId, factors);
  }

  /**
   * Check if candidate factors are cached
   */
  hasCandidateFactors(candidateId: string): boolean {
    return this.candidateFactorsCache.has(candidateId);
  }

  /**
   * Invalidate candidate factors (when candidate data changes)
   */
  invalidateCandidate(candidateId: string): void {
    this.candidateFactorsCache.delete(candidateId);
    // Also invalidate all semantic matches for this candidate
    const keysToDelete: string[] = [];
    this.semanticMatchCache.forEach((_, key) => {
      if (key.endsWith(`_${candidateId}`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.semanticMatchCache.delete(key));
  }

  /**
   * Batch get candidate factors
   */
  getBatchCandidateFactors(candidateIds: string[]): Map<string, MatchFactors> {
    const result = new Map<string, MatchFactors>();

    for (const candidateId of candidateIds) {
      const factors = this.getCandidateFactors(candidateId);
      if (factors) {
        result.set(candidateId, factors);
      }
    }

    return result;
  }

  /**
   * Batch set candidate factors
   */
  setBatchCandidateFactors(factorsMap: Map<string, MatchFactors>): void {
    for (const [candidateId, factors] of factorsMap.entries()) {
      this.setCandidateFactors(candidateId, factors);
    }
  }

  // ============================================
  // Semantic Match Cache
  // ============================================

  /**
   * Get cached semantic match
   */
  getSemanticMatch(jobId: string, candidateId: string): SemanticMatch | null {
    const key = `${jobId}_${candidateId}`;
    return this.semanticMatchCache.get(key) || null;
  }

  /**
   * Set semantic match in cache
   */
  setSemanticMatch(jobId: string, candidateId: string, match: SemanticMatch): void {
    const key = `${jobId}_${candidateId}`;
    this.semanticMatchCache.set(key, match);
  }

  /**
   * Check if semantic match is cached
   */
  hasSemanticMatch(jobId: string, candidateId: string): boolean {
    const key = `${jobId}_${candidateId}`;
    return this.semanticMatchCache.has(key);
  }

  /**
   * Batch get semantic matches
   */
  getBatchSemanticMatches(
    jobId: string,
    candidateIds: string[]
  ): Map<string, SemanticMatch> {
    const result = new Map<string, SemanticMatch>();

    for (const candidateId of candidateIds) {
      const match = this.getSemanticMatch(jobId, candidateId);
      if (match) {
        result.set(candidateId, match);
      }
    }

    return result;
  }

  /**
   * Batch set semantic matches
   */
  setBatchSemanticMatches(
    jobId: string,
    matchesMap: Map<string, SemanticMatch>
  ): void {
    for (const [candidateId, match] of matchesMap.entries()) {
      this.setSemanticMatch(jobId, candidateId, match);
    }
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Get overall cache statistics
   */
  getStats() {
    return {
      jobs: this.jobCache.getStats(),
      candidateFactors: this.candidateFactorsCache.getStats(),
      semanticMatches: this.semanticMatchCache.getStats(),
      totalMemoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get estimated total memory usage
   */
  getMemoryUsage(): number {
    return (
      this.jobCache.getMemoryUsage() +
      this.candidateFactorsCache.getMemoryUsage() +
      this.semanticMatchCache.getMemoryUsage()
    );
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.jobCache.clear();
    this.candidateFactorsCache.clear();
    this.semanticMatchCache.clear();
  }

  /**
   * Clear specific cache
   */
  clear(cache: 'jobs' | 'candidateFactors' | 'semanticMatches'): void {
    switch (cache) {
      case 'jobs':
        this.jobCache.clear();
        break;
      case 'candidateFactors':
        this.candidateFactorsCache.clear();
        break;
      case 'semanticMatches':
        this.semanticMatchCache.clear();
        break;
    }
  }

  /**
   * Purge expired entries from all caches
   */
  purgeExpired(): { jobs: number; candidateFactors: number; semanticMatches: number } {
    return {
      jobs: this.jobCache.purgeExpired(),
      candidateFactors: this.candidateFactorsCache.purgeExpired(),
      semanticMatches: this.semanticMatchCache.purgeExpired(),
    };
  }

  /**
   * Get cache hit rates for monitoring
   */
  getHitRates(): {
    jobs: number;
    candidateFactors: number;
    semanticMatches: number;
    overall: number;
  } {
    const jobStats = this.jobCache.getStats();
    const candidateStats = this.candidateFactorsCache.getStats();
    const semanticStats = this.semanticMatchCache.getStats();

    const totalHits = jobStats.hits + candidateStats.hits + semanticStats.hits;
    const totalRequests =
      jobStats.hits +
      jobStats.misses +
      candidateStats.hits +
      candidateStats.misses +
      semanticStats.hits +
      semanticStats.misses;

    const overall = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      jobs: jobStats.hitRate,
      candidateFactors: candidateStats.hitRate,
      semanticMatches: semanticStats.hitRate,
      overall: Math.round(overall * 100) / 100,
    };
  }
}

// Singleton instance
let matchingCacheInstance: MatchingCache | null = null;

/**
 * Get global matching cache instance
 */
export function getMatchingCache(): MatchingCache {
  if (!matchingCacheInstance) {
    matchingCacheInstance = new MatchingCache();
  }
  return matchingCacheInstance;
}

/**
 * Reset matching cache instance (for testing)
 */
export function resetMatchingCache(): void {
  matchingCacheInstance = null;
}

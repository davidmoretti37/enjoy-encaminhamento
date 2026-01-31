// @ts-nocheck
// Soft Scoring Service - Multi-factor scoring without hard cutoffs
// Each function returns a score from 0-100

import { supabaseAdmin } from '../../supabase';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CandidateData {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  education_level?: string;
  skills?: string[];
  languages?: string[];
  experience?: any[];
  summary?: string;
  disc_dominante?: number;
  disc_influente?: number;
  disc_estavel?: number;
  disc_conforme?: number;
  pdp_top_10_competencies?: string[];
  available_for_internship?: boolean;
  available_for_clt?: boolean;
  available_for_apprentice?: boolean;
  preferred_work_type?: string;
  semantic_similarity?: number;
}

export interface JobData {
  id: string;
  title: string;
  description?: string;
  contract_type: string;
  work_type: string;
  location?: string;
  salary?: number;
  salary_max?: number;
  min_education_level?: string;
  required_skills?: string[];
  required_languages?: string[];
  min_age?: number;
  max_age?: number;
  experience_required?: boolean;
  min_experience_years?: number;
}

export interface CandidatePreferences {
  min_salary?: number;
  max_salary?: number;
  salary_negotiable?: boolean;
  preferred_cities?: string[];
  preferred_states?: string[];
  willing_to_relocate?: boolean;
  preferred_industries?: string[];
}

export interface FactorScores {
  semantic: number;
  skills: number;
  location: number;
  education: number;
  experience: number;
  contract: number;
  personality: number;
  history: number;
  bidirectional: number;
}

// ============================================
// EDUCATION LEVEL MAPPING
// ============================================

const EDUCATION_LEVELS = [
  'fundamental',
  'medio',
  'superior',
  'pos-graduacao',
  'mestrado',
  'doutorado',
];

function getEducationIndex(level?: string): number {
  if (!level) return -1;
  const normalized = level.toLowerCase().trim();
  return EDUCATION_LEVELS.indexOf(normalized);
}

// ============================================
// BRAZILIAN STATE NEIGHBORS
// ============================================

const STATE_NEIGHBORS: Record<string, string[]> = {
  'SP': ['MG', 'RJ', 'PR', 'MS', 'GO'],
  'RJ': ['SP', 'MG', 'ES'],
  'MG': ['SP', 'RJ', 'ES', 'BA', 'GO', 'DF', 'MS'],
  'PR': ['SP', 'SC', 'MS'],
  'SC': ['PR', 'RS'],
  'RS': ['SC'],
  'BA': ['MG', 'ES', 'GO', 'TO', 'PI', 'SE', 'AL', 'PE'],
  'PE': ['BA', 'AL', 'PB', 'PI', 'CE'],
  'CE': ['PE', 'PB', 'RN', 'PI'],
  'GO': ['MG', 'SP', 'MS', 'MT', 'TO', 'BA', 'DF'],
  'DF': ['GO', 'MG'],
  'ES': ['RJ', 'MG', 'BA'],
  'PA': ['AM', 'MT', 'TO', 'MA', 'AP', 'RR'],
  'AM': ['PA', 'MT', 'RO', 'RR', 'AC'],
  'MT': ['GO', 'MS', 'PA', 'AM', 'RO', 'TO'],
  'MS': ['SP', 'MG', 'GO', 'MT', 'PR'],
  'MA': ['PA', 'TO', 'PI'],
  'PI': ['MA', 'TO', 'BA', 'PE', 'CE'],
  'RN': ['CE', 'PB'],
  'PB': ['RN', 'CE', 'PE'],
  'AL': ['PE', 'SE', 'BA'],
  'SE': ['AL', 'BA'],
  'TO': ['PA', 'MA', 'PI', 'BA', 'GO', 'MT'],
  'RO': ['AM', 'MT', 'AC'],
  'AC': ['AM', 'RO'],
  'RR': ['AM', 'PA'],
  'AP': ['PA'],
};

function areNeighboringStates(state1?: string, state2?: string): boolean {
  if (!state1 || !state2) return false;
  const s1 = state1.toUpperCase().trim();
  const s2 = state2.toUpperCase().trim();
  return STATE_NEIGHBORS[s1]?.includes(s2) || STATE_NEIGHBORS[s2]?.includes(s1);
}

// ============================================
// SKILL TAXONOMY CACHE
// ============================================

let skillTaxonomyCache: Map<string, { related: string[]; synonyms: string[] }> | null = null;

async function loadSkillTaxonomy(): Promise<Map<string, { related: string[]; synonyms: string[] }>> {
  if (skillTaxonomyCache) return skillTaxonomyCache;

  const { data, error } = await supabaseAdmin
    .from('skill_taxonomy')
    .select('skill_normalized, related_skills, synonyms');

  if (error || !data) {
    console.warn('Failed to load skill taxonomy:', error);
    return new Map();
  }

  skillTaxonomyCache = new Map();
  for (const row of data) {
    skillTaxonomyCache.set(row.skill_normalized, {
      related: row.related_skills || [],
      synonyms: row.synonyms || [],
    });
  }

  return skillTaxonomyCache;
}

function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score semantic similarity (from vector search)
 * Already provided as 0-1 from embeddings, convert to 0-100
 */
export function scoreSemanticSimilarity(candidate: CandidateData): number {
  const similarity = candidate.semantic_similarity || 0;
  return Math.round(similarity * 100);
}

/**
 * Score skills match with partial credit for related skills
 */
export async function scoreSkills(candidate: CandidateData, job: JobData): Promise<number> {
  const requiredSkills = (job.required_skills || []).map(normalizeSkill);
  const candidateSkills = (candidate.skills || []).map(normalizeSkill);

  if (requiredSkills.length === 0) return 100; // No requirements = full score
  if (candidateSkills.length === 0) return 30; // No skills listed = minimum score

  const taxonomy = await loadSkillTaxonomy();

  let matchedCount = 0;
  let partialMatchCount = 0;

  for (const required of requiredSkills) {
    // Check exact match
    if (candidateSkills.includes(required)) {
      matchedCount++;
      continue;
    }

    // Check synonyms
    const taxEntry = taxonomy.get(required);
    if (taxEntry?.synonyms.some(syn => candidateSkills.includes(normalizeSkill(syn)))) {
      matchedCount++;
      continue;
    }

    // Check related skills (partial credit)
    if (taxEntry?.related.some(rel => candidateSkills.includes(normalizeSkill(rel)))) {
      partialMatchCount++;
      continue;
    }

    // Check if candidate has related skill that maps to this requirement
    for (const candSkill of candidateSkills) {
      const candTax = taxonomy.get(candSkill);
      if (candTax?.related.includes(required)) {
        partialMatchCount++;
        break;
      }
    }
  }

  const exactScore = (matchedCount / requiredSkills.length) * 100;
  const partialScore = (partialMatchCount / requiredSkills.length) * 40; // 40% credit for related skills

  // Bonus for having extra relevant skills
  const extraSkillsBonus = Math.min(10, (candidateSkills.length - requiredSkills.length) * 2);

  return Math.min(100, Math.round(exactScore + partialScore + Math.max(0, extraSkillsBonus)));
}

/**
 * Score location match with distance decay
 */
export function scoreLocation(candidate: CandidateData, job: JobData): number {
  // Remote jobs are location-agnostic
  if (job.work_type === 'remoto') {
    return candidate.preferred_work_type === 'remoto' ? 100 : 85;
  }

  // Hybrid jobs have some flexibility
  if (job.work_type === 'hibrido') {
    if (candidate.preferred_work_type === 'remoto') return 70;
  }

  // Parse job location (usually "City, State" format)
  const jobLocation = job.location || '';
  const [jobCity, jobState] = jobLocation.split(',').map(s => s?.trim().toLowerCase());

  const candidateCity = candidate.city?.toLowerCase().trim();
  const candidateState = candidate.state?.toUpperCase().trim();
  const jobStateUpper = jobState?.toUpperCase();

  // Same city = perfect match
  if (candidateCity && jobCity && candidateCity === jobCity) {
    return 100;
  }

  // Same state
  if (candidateState && jobStateUpper && candidateState === jobStateUpper) {
    return 75;
  }

  // Neighboring states
  if (areNeighboringStates(candidateState, jobStateUpper)) {
    return 50;
  }

  // Different region but still scored
  return 25;
}

/**
 * Score education level match (soft, not binary)
 */
export function scoreEducation(candidate: CandidateData, job: JobData): number {
  const requiredLevel = getEducationIndex(job.min_education_level);
  const candidateLevel = getEducationIndex(candidate.education_level);

  // No requirement = full score
  if (requiredLevel < 0) return 100;

  // No candidate education data
  if (candidateLevel < 0) return 40;

  // Meets or exceeds requirement
  if (candidateLevel >= requiredLevel) {
    // Bonus for exceeding (up to 10 points for 2 levels above)
    const bonus = Math.min(10, (candidateLevel - requiredLevel) * 5);
    return 100; // We don't penalize overqualification
  }

  // Below requirement - soft scoring
  const deficit = requiredLevel - candidateLevel;
  if (deficit === 1) return 75; // One level below
  if (deficit === 2) return 50; // Two levels below
  return 30; // More than two levels below
}

/**
 * Score work experience relevance
 */
export function scoreExperience(candidate: CandidateData, job: JobData): number {
  const experience = candidate.experience || [];

  // If no experience required, having any is a bonus
  if (!job.experience_required) {
    if (experience.length === 0) return 80;
    return 100;
  }

  // Experience required but candidate has none
  if (experience.length === 0) {
    return 40;
  }

  // Calculate total experience duration
  let totalMonths = 0;
  for (const exp of experience) {
    if (exp.start_date) {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      const months = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      totalMonths += months;
    }
  }

  const totalYears = totalMonths / 12;
  const requiredYears = job.min_experience_years || 0;

  if (totalYears >= requiredYears) {
    return 100;
  }

  // Partial credit based on how close they are
  const ratio = requiredYears > 0 ? totalYears / requiredYears : 1;
  return Math.round(40 + (ratio * 60)); // 40-100 range
}

/**
 * Score contract type compatibility
 */
export function scoreContractCompatibility(candidate: CandidateData, job: JobData): number {
  const contractType = job.contract_type;

  switch (contractType) {
    case 'estagio':
      if (candidate.available_for_internship === true) return 100;
      if (candidate.available_for_internship === false) return 40;
      return 70; // Unknown
    case 'clt':
      if (candidate.available_for_clt === true) return 100;
      if (candidate.available_for_clt === false) return 40;
      return 70;
    case 'menor-aprendiz':
      if (candidate.available_for_apprentice === true) return 100;
      if (candidate.available_for_apprentice === false) return 40;
      return 70;
    default:
      return 70;
  }
}

/**
 * Score personality/DISC fit based on job type
 */
export function scorePersonalityFit(candidate: CandidateData, job: JobData): number {
  // If no DISC data, return neutral score
  if (
    candidate.disc_dominante == null &&
    candidate.disc_influente == null &&
    candidate.disc_estavel == null &&
    candidate.disc_conforme == null
  ) {
    return 60; // Neutral - no data
  }

  const d = candidate.disc_dominante || 0;
  const i = candidate.disc_influente || 0;
  const s = candidate.disc_estavel || 0;
  const c = candidate.disc_conforme || 0;

  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();

  // Leadership roles - prefer D and I profiles
  const leadershipKeywords = ['gerente', 'coordenador', 'supervisor', 'líder', 'diretor'];
  if (leadershipKeywords.some(k => title.includes(k))) {
    const score = (d * 0.4) + (i * 0.3) + (s * 0.15) + (c * 0.15);
    return Math.round(score);
  }

  // Sales/Customer-facing - prefer I and S profiles
  const salesKeywords = ['vendas', 'vendedor', 'atendimento', 'comercial'];
  if (salesKeywords.some(k => title.includes(k) || description.includes(k))) {
    const score = (d * 0.15) + (i * 0.4) + (s * 0.35) + (c * 0.1);
    return Math.round(score);
  }

  // Technical/Analytical - prefer C and D profiles
  const techKeywords = ['desenvolvedor', 'analista', 'engenheiro', 'programador'];
  if (techKeywords.some(k => title.includes(k))) {
    const score = (d * 0.25) + (i * 0.1) + (s * 0.2) + (c * 0.45);
    return Math.round(score);
  }

  // Administrative/Support - prefer S and C profiles
  const adminKeywords = ['administrativo', 'assistente', 'auxiliar', 'secretária'];
  if (adminKeywords.some(k => title.includes(k))) {
    const score = (d * 0.1) + (i * 0.15) + (s * 0.4) + (c * 0.35);
    return Math.round(score);
  }

  // Default - balanced
  return Math.round((d + i + s + c) / 4);
}

/**
 * Score based on historical performance (contracts, feedback)
 * This requires querying past data
 */
export async function scoreHistoricalPerformance(candidateId: string): Promise<number> {
  try {
    // Get past contracts for this candidate
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('status, created_at')
      .eq('candidate_id', candidateId);

    if (contractsError || !contracts || contracts.length === 0) {
      return 70; // No history = neutral score
    }

    // Calculate completion rate
    const completed = contracts.filter(c => c.status === 'completed').length;
    const terminated = contracts.filter(c => c.status === 'terminated').length;
    const total = contracts.length;

    if (total === 0) return 70;

    // Penalize early terminations, reward completions
    const completionRate = completed / total;
    const terminationPenalty = (terminated / total) * 30;

    let score = 70 + (completionRate * 30) - terminationPenalty;

    // Get feedback if available
    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('feedback')
      .select('performance, punctuality, communication, teamwork, technical_skills')
      .eq('candidate_id', candidateId);

    if (!feedbackError && feedback && feedback.length > 0) {
      // Average all feedback scores (1-5 scale)
      let totalFeedbackScore = 0;
      let feedbackCount = 0;

      for (const f of feedback) {
        const scores = [f.performance, f.punctuality, f.communication, f.teamwork, f.technical_skills];
        for (const s of scores) {
          if (s != null) {
            totalFeedbackScore += s;
            feedbackCount++;
          }
        }
      }

      if (feedbackCount > 0) {
        const avgFeedback = totalFeedbackScore / feedbackCount; // 1-5 scale
        const feedbackBonus = ((avgFeedback - 3) / 2) * 20; // -20 to +20 adjustment
        score += feedbackBonus;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  } catch (error) {
    console.error('Error scoring historical performance:', error);
    return 70; // Default on error
  }
}

/**
 * Score bidirectional match (does candidate want this type of job?)
 */
export async function scoreBidirectionalMatch(
  candidateId: string,
  candidate: CandidateData,
  job: JobData
): Promise<number> {
  let score = 70; // Start neutral

  // Check work type preference
  if (candidate.preferred_work_type) {
    if (candidate.preferred_work_type === job.work_type) {
      score += 15;
    } else if (job.work_type === 'hibrido') {
      score += 10; // Hybrid is somewhat flexible
    } else {
      score -= 10;
    }
  }

  // Try to get candidate preferences from preferences table
  try {
    const { data: prefs, error } = await supabaseAdmin
      .from('candidate_preferences')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (!error && prefs) {
      // Check location preferences
      if (prefs.preferred_states?.length > 0 && job.location) {
        const jobState = job.location.split(',')[1]?.trim().toUpperCase();
        if (jobState && prefs.preferred_states.includes(jobState)) {
          score += 10;
        } else if (!prefs.willing_to_relocate) {
          score -= 15;
        }
      }

      // Check salary (if we have salary data)
      if (job.salary && prefs.min_salary) {
        if (job.salary >= prefs.min_salary) {
          score += 10;
        } else if (!prefs.salary_negotiable) {
          score -= 15;
        }
      }
    }
  } catch (error) {
    // Preferences table might not have data - that's ok
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate data completeness for a candidate (0-100)
 */
export function calculateDataCompleteness(candidate: CandidateData): number {
  const fields = [
    candidate.full_name,
    candidate.email,
    candidate.phone,
    candidate.city,
    candidate.state,
    candidate.education_level,
    candidate.skills?.length,
    candidate.experience?.length,
    candidate.summary,
    candidate.disc_dominante != null,
    candidate.available_for_internship != null,
    candidate.preferred_work_type,
  ];

  const filledFields = fields.filter(f => f).length;
  return Math.round((filledFields / fields.length) * 100);
}

/**
 * Calculate all factor scores for a candidate-job pair
 */
export async function calculateAllFactors(
  candidate: CandidateData,
  job: JobData
): Promise<FactorScores> {
  const [
    skillsScore,
    historyScore,
    bidirectionalScore,
  ] = await Promise.all([
    scoreSkills(candidate, job),
    scoreHistoricalPerformance(candidate.id),
    scoreBidirectionalMatch(candidate.id, candidate, job),
  ]);

  return {
    semantic: scoreSemanticSimilarity(candidate),
    skills: skillsScore,
    location: scoreLocation(candidate, job),
    education: scoreEducation(candidate, job),
    experience: scoreExperience(candidate, job),
    contract: scoreContractCompatibility(candidate, job),
    personality: scorePersonalityFit(candidate, job),
    history: historyScore,
    bidirectional: bidirectionalScore,
  };
}

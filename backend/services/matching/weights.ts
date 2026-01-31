// @ts-nocheck
// Weight Profiles for Advanced AI Matching
// Defines how different factors are weighted for different job types

export interface WeightConfig {
  semantic: number;      // Vector embedding similarity
  skills: number;        // Skills overlap + related skills
  location: number;      // Geographic match
  education: number;     // Education level match
  experience: number;    // Work experience relevance
  contract: number;      // Contract type compatibility
  personality: number;   // DISC/personality fit
  history: number;       // Past performance/reliability
  bidirectional: number; // Candidate preference match
}

export interface WeightProfile {
  name: string;
  description: string;
  weights: WeightConfig;
}

// Validate weights sum to 1.0
function validateWeights(weights: WeightConfig): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.001;
}

// Default balanced profile - equal emphasis on all factors
export const BALANCED_WEIGHTS: WeightProfile = {
  name: 'balanced',
  description: 'Perfil equilibrado - considera todos os fatores igualmente',
  weights: {
    semantic: 0.15,
    skills: 0.20,
    location: 0.10,
    education: 0.10,
    experience: 0.10,
    contract: 0.10,
    personality: 0.05,
    history: 0.10,
    bidirectional: 0.10,
  },
};

// Technical roles - emphasize skills and education
export const TECHNICAL_WEIGHTS: WeightProfile = {
  name: 'technical',
  description: 'Perfil técnico - prioriza habilidades técnicas e formação',
  weights: {
    semantic: 0.10,
    skills: 0.35,
    location: 0.05,
    education: 0.15,
    experience: 0.15,
    contract: 0.05,
    personality: 0.05,
    history: 0.05,
    bidirectional: 0.05,
  },
};

// Customer-facing roles - emphasize personality and communication
export const CUSTOMER_FACING_WEIGHTS: WeightProfile = {
  name: 'customer_facing',
  description: 'Perfil atendimento - prioriza personalidade e comunicação',
  weights: {
    semantic: 0.10,
    skills: 0.15,
    location: 0.10,
    education: 0.05,
    experience: 0.10,
    contract: 0.05,
    personality: 0.25,
    history: 0.15,
    bidirectional: 0.05,
  },
};

// Entry-level/Internship - emphasize potential over experience
export const ENTRY_LEVEL_WEIGHTS: WeightProfile = {
  name: 'entry_level',
  description: 'Perfil estágio/júnior - prioriza potencial sobre experiência',
  weights: {
    semantic: 0.15,
    skills: 0.20,
    location: 0.10,
    education: 0.20,
    experience: 0.05,
    contract: 0.10,
    personality: 0.10,
    history: 0.05,
    bidirectional: 0.05,
  },
};

// Leadership roles - emphasize experience and personality
export const LEADERSHIP_WEIGHTS: WeightProfile = {
  name: 'leadership',
  description: 'Perfil liderança - prioriza experiência e perfil comportamental',
  weights: {
    semantic: 0.10,
    skills: 0.15,
    location: 0.05,
    education: 0.10,
    experience: 0.25,
    contract: 0.05,
    personality: 0.20,
    history: 0.05,
    bidirectional: 0.05,
  },
};

// All available profiles
export const WEIGHT_PROFILES: Record<string, WeightProfile> = {
  balanced: BALANCED_WEIGHTS,
  technical: TECHNICAL_WEIGHTS,
  customer_facing: CUSTOMER_FACING_WEIGHTS,
  entry_level: ENTRY_LEVEL_WEIGHTS,
  leadership: LEADERSHIP_WEIGHTS,
};

// Get a weight profile by name
export function getWeightProfile(name: string): WeightProfile {
  return WEIGHT_PROFILES[name] || BALANCED_WEIGHTS;
}

// Get all available profiles (for UI selection)
export function getAllWeightProfiles(): WeightProfile[] {
  return Object.values(WEIGHT_PROFILES);
}

// Create a custom weight profile
export function createCustomWeights(customWeights: Partial<WeightConfig>): WeightConfig {
  // Start with balanced weights
  const weights: WeightConfig = { ...BALANCED_WEIGHTS.weights };

  // Apply custom overrides
  for (const [key, value] of Object.entries(customWeights)) {
    if (key in weights && typeof value === 'number' && value >= 0 && value <= 1) {
      weights[key as keyof WeightConfig] = value;
    }
  }

  // Normalize to ensure sum is 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum !== 0) {
    for (const key of Object.keys(weights) as Array<keyof WeightConfig>) {
      weights[key] = weights[key] / sum;
    }
  }

  return weights;
}

// Calculate composite score from individual factor scores
export function calculateCompositeScore(
  factors: Record<string, number>,
  weights: WeightConfig
): number {
  let score = 0;

  score += (factors.semantic || 0) * weights.semantic;
  score += (factors.skills || 0) * weights.skills;
  score += (factors.location || 0) * weights.location;
  score += (factors.education || 0) * weights.education;
  score += (factors.experience || 0) * weights.experience;
  score += (factors.contract || 0) * weights.contract;
  score += (factors.personality || 0) * weights.personality;
  score += (factors.history || 0) * weights.history;
  score += (factors.bidirectional || 0) * weights.bidirectional;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// Suggest a weight profile based on job characteristics
export function suggestWeightProfile(job: {
  contract_type?: string;
  title?: string;
  required_skills?: string[];
  description?: string;
}): string {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const skills = (job.required_skills || []).map(s => s.toLowerCase());

  // Check for leadership roles
  const leadershipKeywords = ['gerente', 'coordenador', 'supervisor', 'diretor', 'líder', 'head', 'manager'];
  if (leadershipKeywords.some(k => title.includes(k) || description.includes(k))) {
    return 'leadership';
  }

  // Check for technical roles
  const technicalKeywords = ['desenvolvedor', 'programador', 'engenheiro', 'analista de sistemas', 'devops', 'developer', 'software'];
  const technicalSkills = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'docker', 'aws'];
  if (
    technicalKeywords.some(k => title.includes(k) || description.includes(k)) ||
    skills.some(s => technicalSkills.some(ts => s.includes(ts)))
  ) {
    return 'technical';
  }

  // Check for customer-facing roles
  const customerKeywords = ['atendimento', 'vendedor', 'vendas', 'recepcionista', 'suporte', 'comercial', 'customer'];
  if (customerKeywords.some(k => title.includes(k) || description.includes(k))) {
    return 'customer_facing';
  }

  // Check for entry-level/internship
  if (job.contract_type === 'estagio' || job.contract_type === 'menor-aprendiz') {
    return 'entry_level';
  }

  // Default to balanced
  return 'balanced';
}

// Validate all predefined profiles at module load
for (const [name, profile] of Object.entries(WEIGHT_PROFILES)) {
  if (!validateWeights(profile.weights)) {
    console.warn(`Weight profile "${name}" does not sum to 1.0`);
  }
}

// Explainability Service - Generate human-readable explanations for matches
// Provides transparency into why a candidate was ranked for a job

import { CandidateData, JobData, FactorScores, calculateDataCompleteness } from './softScoring';
import { WeightConfig } from './weights';
import { LLMReRankResult } from './llmReranking';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FactorExplanation {
  name: string;
  displayName: string;
  score: number;
  weight: number;
  contribution: number;
  explanation: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MatchExplanation {
  summary: string;
  compositeScore: number;
  factors: FactorExplanation[];
  strengths: string[];
  opportunities: string[];
  concerns: string[];
  aiReasoning?: string;
  confidence: number;
  dataCompleteness: number;
  recommendation?: string;
}

// ============================================
// FACTOR DISPLAY NAMES
// ============================================

const FACTOR_DISPLAY_NAMES: Record<string, string> = {
  semantic: 'Compatibilidade Semântica',
  skills: 'Habilidades',
  location: 'Localização',
  education: 'Educação',
  experience: 'Experiência',
  contract: 'Tipo de Contrato',
  personality: 'Perfil Comportamental',
  history: 'Histórico',
  bidirectional: 'Preferências do Candidato',
};

// ============================================
// STATUS CLASSIFICATION
// ============================================

function getScoreStatus(score: number): FactorExplanation['status'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

// ============================================
// EXPLANATION GENERATORS
// ============================================

function explainSemantic(score: number): string {
  if (score >= 85) return 'Perfil altamente alinhado com a descrição da vaga';
  if (score >= 70) return 'Bom alinhamento com o perfil desejado';
  if (score >= 50) return 'Alinhamento moderado com a vaga';
  return 'Perfil diferente do típico para esta vaga, mas pode trazer perspectiva única';
}

function explainSkills(score: number, candidate: CandidateData, job: JobData): string {
  const required = job.required_skills?.length || 0;
  const has = candidate.skills?.length || 0;

  if (score >= 85) return `Possui ${has > required ? 'mais que' : 'todas'} as ${required} habilidades necessárias`;
  if (score >= 70) return `Possui a maioria das ${required} habilidades requeridas`;
  if (score >= 50) return `Possui algumas habilidades relevantes (${has} de ${required})`;
  if (has === 0) return 'Habilidades não informadas no perfil';
  return `Poucas habilidades correspondentes, mas pode desenvolver`;
}

function explainLocation(score: number, candidate: CandidateData, job: JobData): string {
  if (job.work_type === 'remoto') {
    return score >= 85 ? 'Trabalho remoto - localização não é fator' : 'Prefere trabalho presencial, mas vaga é remota';
  }
  if (score >= 85) return `Localizado na mesma cidade (${candidate.city})`;
  if (score >= 70) return `Mesmo estado (${candidate.state})`;
  if (score >= 50) return 'Estado vizinho - deslocamento viável';
  return 'Localização diferente, pode requerer mudança';
}

function explainEducation(score: number, candidate: CandidateData, job: JobData): string {
  const levels: Record<string, string> = {
    'fundamental': 'Ensino Fundamental',
    'medio': 'Ensino Médio',
    'superior': 'Ensino Superior',
    'pos-graduacao': 'Pós-Graduação',
    'mestrado': 'Mestrado',
    'doutorado': 'Doutorado',
  };

  const candidateLevel = levels[candidate.education_level || ''] || 'Não informado';
  const requiredLevel = levels[job.min_education_level || ''] || 'Não especificado';

  if (score >= 85) return `${candidateLevel} atende ou excede o requisito (${requiredLevel})`;
  if (score >= 70) return `${candidateLevel} está próximo do requisito (${requiredLevel})`;
  if (score >= 50) return `${candidateLevel} abaixo do ideal, mas pode compensar com experiência`;
  return `${candidateLevel} - diferente do requisito (${requiredLevel})`;
}

function explainExperience(score: number, candidate: CandidateData, job: JobData): string {
  const expCount = candidate.experience?.length || 0;

  if (!job.experience_required) {
    return expCount > 0 ? `${expCount} experiência(s) anterior(es) - diferencial` : 'Experiência não requerida para esta vaga';
  }

  if (score >= 85) return `Experiência adequada com ${expCount} posição(ões) anterior(es)`;
  if (score >= 70) return `Boa experiência, próximo do ideal`;
  if (score >= 50) return `Alguma experiência, ainda desenvolvendo carreira`;
  return expCount === 0 ? 'Sem experiência registrada, candidato iniciante' : 'Experiência limitada para o requisito';
}

function explainContract(score: number, candidate: CandidateData, job: JobData): string {
  const typeNames: Record<string, string> = {
    'estagio': 'estágio',
    'clt': 'CLT',
    'menor-aprendiz': 'menor aprendiz',
  };
  const typeName = typeNames[job.contract_type] || job.contract_type;

  if (score >= 85) return `Disponível e interessado em ${typeName}`;
  if (score >= 70) return `Provavelmente disponível para ${typeName}`;
  if (score >= 50) return `Disponibilidade para ${typeName} não confirmada`;
  return `Pode não estar disponível para ${typeName}`;
}

function explainPersonality(score: number, candidate: CandidateData, job: JobData): string {
  if (candidate.disc_dominante == null) return 'Perfil comportamental não avaliado';

  const dominant = Math.max(
    candidate.disc_dominante || 0,
    candidate.disc_influente || 0,
    candidate.disc_estavel || 0,
    candidate.disc_conforme || 0
  );

  const profile = dominant === candidate.disc_dominante ? 'Dominante' :
                  dominant === candidate.disc_influente ? 'Influente' :
                  dominant === candidate.disc_estavel ? 'Estável' : 'Conforme';

  if (score >= 85) return `Perfil ${profile} altamente adequado para esta função`;
  if (score >= 70) return `Perfil ${profile} compatível com a vaga`;
  if (score >= 50) return `Perfil ${profile} pode se adaptar à função`;
  return `Perfil ${profile} diferente do típico, mas diversidade é positiva`;
}

function explainHistory(score: number): string {
  if (score >= 85) return 'Excelente histórico em contratos anteriores';
  if (score >= 70) return 'Bom histórico profissional';
  if (score >= 50) return 'Histórico profissional em desenvolvimento';
  if (score <= 40) return 'Poucos dados de histórico disponíveis';
  return 'Primeiro emprego ou sem histórico na plataforma';
}

function explainBidirectional(score: number): string {
  if (score >= 85) return 'Vaga alinhada com as preferências do candidato';
  if (score >= 70) return 'Boa compatibilidade com preferências do candidato';
  if (score >= 50) return 'Compatibilidade parcial com preferências';
  return 'Vaga pode não ser a preferência ideal do candidato';
}

// ============================================
// MAIN EXPLANATION GENERATOR
// ============================================

export function generateExplanation(
  candidate: CandidateData,
  job: JobData,
  factors: FactorScores,
  weights: WeightConfig,
  compositeScore: number,
  llmResult?: LLMReRankResult | null
): MatchExplanation {
  // Generate factor explanations
  const factorExplanations: FactorExplanation[] = [
    {
      name: 'semantic',
      displayName: FACTOR_DISPLAY_NAMES.semantic,
      score: factors.semantic,
      weight: weights.semantic,
      contribution: factors.semantic * weights.semantic,
      explanation: explainSemantic(factors.semantic),
      status: getScoreStatus(factors.semantic),
    },
    {
      name: 'skills',
      displayName: FACTOR_DISPLAY_NAMES.skills,
      score: factors.skills,
      weight: weights.skills,
      contribution: factors.skills * weights.skills,
      explanation: explainSkills(factors.skills, candidate, job),
      status: getScoreStatus(factors.skills),
    },
    {
      name: 'location',
      displayName: FACTOR_DISPLAY_NAMES.location,
      score: factors.location,
      weight: weights.location,
      contribution: factors.location * weights.location,
      explanation: explainLocation(factors.location, candidate, job),
      status: getScoreStatus(factors.location),
    },
    {
      name: 'education',
      displayName: FACTOR_DISPLAY_NAMES.education,
      score: factors.education,
      weight: weights.education,
      contribution: factors.education * weights.education,
      explanation: explainEducation(factors.education, candidate, job),
      status: getScoreStatus(factors.education),
    },
    {
      name: 'experience',
      displayName: FACTOR_DISPLAY_NAMES.experience,
      score: factors.experience,
      weight: weights.experience,
      contribution: factors.experience * weights.experience,
      explanation: explainExperience(factors.experience, candidate, job),
      status: getScoreStatus(factors.experience),
    },
    {
      name: 'contract',
      displayName: FACTOR_DISPLAY_NAMES.contract,
      score: factors.contract,
      weight: weights.contract,
      contribution: factors.contract * weights.contract,
      explanation: explainContract(factors.contract, candidate, job),
      status: getScoreStatus(factors.contract),
    },
    {
      name: 'personality',
      displayName: FACTOR_DISPLAY_NAMES.personality,
      score: factors.personality,
      weight: weights.personality,
      contribution: factors.personality * weights.personality,
      explanation: explainPersonality(factors.personality, candidate, job),
      status: getScoreStatus(factors.personality),
    },
    {
      name: 'history',
      displayName: FACTOR_DISPLAY_NAMES.history,
      score: factors.history,
      weight: weights.history,
      contribution: factors.history * weights.history,
      explanation: explainHistory(factors.history),
      status: getScoreStatus(factors.history),
    },
    {
      name: 'bidirectional',
      displayName: FACTOR_DISPLAY_NAMES.bidirectional,
      score: factors.bidirectional,
      weight: weights.bidirectional,
      contribution: factors.bidirectional * weights.bidirectional,
      explanation: explainBidirectional(factors.bidirectional),
      status: getScoreStatus(factors.bidirectional),
    },
  ];

  // Sort by contribution (most impactful first)
  factorExplanations.sort((a, b) => b.contribution - a.contribution);

  // Extract strengths, opportunities, and concerns
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const concerns: string[] = [];

  for (const f of factorExplanations) {
    if (f.status === 'excellent') {
      strengths.push(f.explanation);
    } else if (f.status === 'good') {
      // High-weight good factors are strengths, low-weight are opportunities
      if (f.weight >= 0.15) {
        strengths.push(f.explanation);
      } else {
        opportunities.push(f.explanation);
      }
    } else if (f.status === 'fair') {
      opportunities.push(f.explanation);
    } else {
      concerns.push(f.explanation);
    }
  }

  // Add LLM insights if available
  if (llmResult) {
    // Merge LLM strengths/concerns with algorithmic ones (avoid duplicates)
    for (const s of llmResult.strengths) {
      if (!strengths.some(existing => existing.toLowerCase().includes(s.toLowerCase().slice(0, 20)))) {
        strengths.push(s);
      }
    }
    for (const c of llmResult.concerns) {
      if (!concerns.some(existing => existing.toLowerCase().includes(c.toLowerCase().slice(0, 20)))) {
        concerns.push(c);
      }
    }
  }

  // Generate summary
  const summary = generateSummary(compositeScore, strengths.length, concerns.length, llmResult);

  // Calculate confidence
  const dataCompleteness = calculateDataCompleteness(candidate);
  const baseConfidence = dataCompleteness * 0.6 + 40; // 40-100 range based on data
  const confidence = llmResult ? Math.round((baseConfidence + llmResult.confidence) / 2) : Math.round(baseConfidence);

  return {
    summary,
    compositeScore: Math.round(compositeScore * 10) / 10,
    factors: factorExplanations,
    strengths: strengths.slice(0, 5),
    opportunities: opportunities.slice(0, 3),
    concerns: concerns.slice(0, 3),
    aiReasoning: llmResult?.reasoning,
    confidence,
    dataCompleteness,
    recommendation: llmResult?.recommendation,
  };
}

function generateSummary(
  score: number,
  strengthCount: number,
  concernCount: number,
  llmResult?: LLMReRankResult | null
): string {
  // Use LLM recommendation if available
  if (llmResult?.recommendation) {
    switch (llmResult.recommendation) {
      case 'HIGHLY_RECOMMENDED':
        return 'Candidato altamente recomendado - excelente compatibilidade';
      case 'RECOMMENDED':
        return 'Candidato recomendado - boa compatibilidade com a vaga';
      case 'CONSIDER':
        return 'Candidato a considerar - compatibilidade moderada';
      case 'NOT_RECOMMENDED':
        return 'Candidato com baixa compatibilidade para esta vaga específica';
    }
  }

  // Algorithmic summary
  if (score >= 85) {
    return 'Excelente compatibilidade - candidato fortemente alinhado com a vaga';
  }
  if (score >= 70) {
    return strengthCount > concernCount
      ? 'Boa compatibilidade - mais pontos fortes que preocupações'
      : 'Boa compatibilidade - candidato promissor com áreas de desenvolvimento';
  }
  if (score >= 50) {
    return 'Compatibilidade moderada - avaliar potencial e disponibilidade para desenvolvimento';
  }
  return 'Compatibilidade baixa - considerar apenas se houver potencial específico identificado';
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get a brief one-line explanation for quick display
 */
export function getBriefExplanation(explanation: MatchExplanation): string {
  const topStrength = explanation.strengths[0] || '';
  const topConcern = explanation.concerns[0] || '';

  if (explanation.compositeScore >= 70 && topStrength) {
    return `Score ${explanation.compositeScore.toFixed(0)}: ${topStrength}`;
  }

  if (topConcern) {
    return `Score ${explanation.compositeScore.toFixed(0)}: ${topStrength || 'Candidato potencial'}. Nota: ${topConcern}`;
  }

  return `Score ${explanation.compositeScore.toFixed(0)}: ${explanation.summary}`;
}

/**
 * Convert explanation to plain text format
 */
export function explanationToText(explanation: MatchExplanation): string {
  let text = `## ${explanation.summary}\n\n`;
  text += `**Score:** ${explanation.compositeScore.toFixed(1)}/100\n`;
  text += `**Confiança:** ${explanation.confidence}%\n`;
  text += `**Dados Completos:** ${explanation.dataCompleteness}%\n\n`;

  if (explanation.strengths.length > 0) {
    text += `### Pontos Fortes\n`;
    for (const s of explanation.strengths) {
      text += `- ${s}\n`;
    }
    text += '\n';
  }

  if (explanation.opportunities.length > 0) {
    text += `### Oportunidades de Desenvolvimento\n`;
    for (const o of explanation.opportunities) {
      text += `- ${o}\n`;
    }
    text += '\n';
  }

  if (explanation.concerns.length > 0) {
    text += `### Pontos de Atenção\n`;
    for (const c of explanation.concerns) {
      text += `- ${c}\n`;
    }
    text += '\n';
  }

  if (explanation.aiReasoning) {
    text += `### Análise de IA\n${explanation.aiReasoning}\n`;
  }

  return text;
}

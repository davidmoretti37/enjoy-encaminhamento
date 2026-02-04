// @ts-nocheck
// LLM Re-Ranking Service - Stage 4 of the matching pipeline
// Uses LLM to deeply analyze top candidates and provide explanations

import { generateWithGroq } from '../ai/groq';
import { CandidateData, JobData, FactorScores } from './softScoring';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface LLMReRankResult {
  candidateId: string;
  refinedScore: number;
  confidence: number;
  strengths: string[];
  concerns: string[];
  recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONSIDER' | 'NOT_RECOMMENDED';
  reasoning: string;
}

export interface CandidateForReRank {
  candidate: CandidateData;
  factors: FactorScores;
  compositeScore: number;
}

// ============================================
// PROMPT TEMPLATES
// ============================================

const SYSTEM_PROMPT = `Você é um especialista em recrutamento e seleção com anos de experiência em matching de candidatos com vagas.

Sua tarefa é avaliar a compatibilidade entre candidatos e uma vaga de emprego, fornecendo:
1. Uma pontuação refinada (0-100)
2. Um nível de confiança na sua avaliação (0-100)
3. Pontos fortes do candidato para esta vaga
4. Preocupações ou lacunas identificadas
5. Uma recomendação clara
6. Um raciocínio breve explicando sua avaliação

IMPORTANTE:
- Seja inclusivo e considere potencial, não apenas experiência exata
- Valorize habilidades transferíveis e capacidade de aprendizado
- Considere o contexto brasileiro de mercado de trabalho
- Não exclua candidatos por pequenas lacunas - pontue de forma justa
- Foque no potencial de sucesso na função

Responda APENAS em JSON válido no formato:
{
  "refinedScore": <número 0-100>,
  "confidence": <número 0-100>,
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", ...],
  "concerns": ["<preocupação 1>", ...],
  "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER|NOT_RECOMMENDED>",
  "reasoning": "<explicação de 2-3 frases>"
}`;

function buildCandidatePrompt(
  candidate: CandidateData,
  job: JobData,
  factors: FactorScores,
  compositeScore: number
): string {
  const formatExperience = (exp: any[] | undefined): string => {
    if (!exp || exp.length === 0) return 'Nenhuma experiência registrada';
    return exp.map(e =>
      `- ${e.company || 'Empresa'}: ${e.role || e.position || 'Cargo'} (${e.start_date || '?'} - ${e.end_date || 'atual'})`
    ).join('\n');
  };

  return `## VAGA: ${job.title}

**Descrição:** ${job.description || 'Não especificada'}
**Tipo de Contrato:** ${job.contract_type}
**Tipo de Trabalho:** ${job.work_type}
**Localização:** ${job.location || 'Não especificada'}
**Salário:** ${job.salary ? `R$ ${job.salary}` : 'Não informado'}${job.salary_max ? ` - R$ ${job.salary_max}` : ''}
**Educação Mínima:** ${job.min_education_level || 'Não especificada'}
**Habilidades Requeridas:** ${(job.required_skills || []).join(', ') || 'Não especificadas'}
**Idiomas Requeridos:** ${(job.required_languages || []).join(', ') || 'Não especificados'}
**Experiência Requerida:** ${job.experience_required ? `Sim, mínimo ${job.min_experience_years || 0} anos` : 'Não'}

---

## CANDIDATO: ${candidate.full_name}

**Localização:** ${candidate.city || '?'}, ${candidate.state || '?'}
**Educação:** ${candidate.education_level || 'Não informada'}
**Habilidades:** ${(candidate.skills || []).join(', ') || 'Não informadas'}
**Idiomas:** ${(candidate.languages || []).join(', ') || 'Não informados'}

**Experiência:**
${formatExperience(candidate.experience)}

**Perfil DISC:**
- Dominante: ${candidate.disc_dominante ?? 'N/A'}%
- Influente: ${candidate.disc_influente ?? 'N/A'}%
- Estável: ${candidate.disc_estavel ?? 'N/A'}%
- Conforme: ${candidate.disc_conforme ?? 'N/A'}%

**Competências (Top 10):** ${(candidate.pdp_top_10_competencies || []).join(', ') || 'Não avaliadas'}

**Disponibilidade:**
- Estágio: ${candidate.available_for_internship ? 'Sim' : candidate.available_for_internship === false ? 'Não' : 'N/A'}
- CLT: ${candidate.available_for_clt ? 'Sim' : candidate.available_for_clt === false ? 'Não' : 'N/A'}
- Menor Aprendiz: ${candidate.available_for_apprentice ? 'Sim' : candidate.available_for_apprentice === false ? 'Não' : 'N/A'}
- Trabalho Preferido: ${candidate.preferred_work_type || 'N/A'}

**Resumo do Candidato:**
${candidate.summary || 'Sem resumo disponível'}

---

## PONTUAÇÃO PRÉVIA DO ALGORITMO

- **Score Composto:** ${compositeScore.toFixed(1)}
- Semântico: ${factors.semantic}
- Habilidades: ${factors.skills}
- Localização: ${factors.location}
- Educação: ${factors.education}
- Experiência: ${factors.experience}
- Contrato: ${factors.contract}
- Personalidade: ${factors.personality}
- Histórico: ${factors.history}
- Bidirecional: ${factors.bidirectional}

---

Avalie este candidato para esta vaga. Seja justo, inclusivo e considere o potencial. Responda em JSON.`;
}

// ============================================
// RE-RANKING FUNCTIONS
// ============================================

/**
 * Re-rank a single candidate using LLM
 */
export async function reRankCandidate(
  candidate: CandidateData,
  job: JobData,
  factors: FactorScores,
  compositeScore: number
): Promise<LLMReRankResult | null> {
  try {
    const userPrompt = buildCandidatePrompt(candidate, job, factors, compositeScore);

    const response = await generateWithGroq(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 800 }
    );

    if (!response) {
      console.warn(`LLM re-ranking failed for candidate ${candidate.id} - empty response`);
      return null;
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    return {
      candidateId: candidate.id,
      refinedScore: Math.max(0, Math.min(100, Number(parsed.refinedScore) || compositeScore)),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 70)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      recommendation: validateRecommendation(parsed.recommendation),
      reasoning: String(parsed.reasoning || '').slice(0, 500),
    };
  } catch (error) {
    console.error(`LLM re-ranking error for candidate ${candidate.id}:`, error);
    return null;
  }
}

/**
 * Re-rank a batch of candidates using LLM
 * Processes in parallel with concurrency limit
 */
export async function reRankCandidatesBatch(
  candidates: CandidateForReRank[],
  job: JobData,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Map<string, LLMReRankResult>> {
  const { concurrency = 5, onProgress } = options;
  const results = new Map<string, LLMReRankResult>();

  // Process in batches with concurrency limit
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);

    const batchPromises = batch.map(async (item) => {
      const result = await reRankCandidate(
        item.candidate,
        job,
        item.factors,
        item.compositeScore
      );
      return { candidateId: item.candidate.id, result };
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { candidateId, result } of batchResults) {
      if (result) {
        results.set(candidateId, result);
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + concurrency, candidates.length), candidates.length);
    }
  }

  return results;
}

/**
 * Filter candidates that should be re-ranked based on threshold
 */
export function filterForReRanking(
  candidates: CandidateForReRank[],
  options: {
    minScore?: number;
    maxCount?: number;
  } = {}
): CandidateForReRank[] {
  const { minScore = 60, maxCount = 50 } = options;

  // Sort by composite score descending
  const sorted = [...candidates].sort((a, b) => b.compositeScore - a.compositeScore);

  // Filter by minimum score and limit count
  return sorted
    .filter(c => c.compositeScore >= minScore)
    .slice(0, maxCount);
}

// ============================================
// LISTWISE PRE-SCREENING
// ============================================

const LISTWISE_SYSTEM_PROMPT = `Você é um especialista em recrutamento. Sua tarefa é analisar uma lista de candidatos resumidos e selecionar os melhores para análise detalhada.

Responda APENAS em JSON válido no formato:
{"selected": ["id1", "id2", ...]}`;

/**
 * Pre-screen candidates using a single LLM call with compact profiles.
 * Selects the top N candidates from a larger pool for detailed re-ranking.
 */
export async function preScreenCandidatesListwise(
  candidates: CandidateForReRank[],
  job: JobData,
  selectCount: number = 15
): Promise<string[]> {
  try {
    const candidateLines = candidates.map((c, i) => {
      const cand = c.candidate;
      return `${i + 1}. ID: ${cand.id} | Score: ${c.compositeScore.toFixed(0)} | Skills: ${(cand.skills || []).slice(0, 5).join(', ') || 'N/A'} | Loc: ${cand.city || '?'}/${cand.state || '?'} | Ed: ${cand.education_level || 'N/A'}`;
    }).join('\n');

    const userPrompt = `## VAGA: ${job.title}
Tipo: ${job.contract_type} | Local: ${job.location || 'N/A'} | Trabalho: ${job.work_type}
Habilidades: ${(job.required_skills || []).join(', ') || 'N/A'}
Educação mínima: ${job.min_education_level || 'N/A'}

## CANDIDATOS (${candidates.length} total):
${candidateLines}

Selecione os ${selectCount} melhores candidatos para análise detalhada. Considere compatibilidade de habilidades, localização e educação. Retorne APENAS o JSON com os IDs selecionados.`;

    const response = await generateWithGroq(
      [
        { role: 'system', content: LISTWISE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2, maxTokens: 500 }
    );

    if (!response) {
      return candidates.slice(0, selectCount).map(c => c.candidate.id);
    }

    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.selected) && parsed.selected.length > 0) {
      return parsed.selected.slice(0, selectCount);
    }

    return candidates.slice(0, selectCount).map(c => c.candidate.id);
  } catch (error) {
    console.warn('Listwise pre-screening failed, falling back to top by score:', error);
    return candidates.slice(0, selectCount).map(c => c.candidate.id);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function validateRecommendation(rec: any): LLMReRankResult['recommendation'] {
  const valid = ['HIGHLY_RECOMMENDED', 'RECOMMENDED', 'CONSIDER', 'NOT_RECOMMENDED'];
  const normalized = String(rec || '').toUpperCase().replace(/\s+/g, '_');
  return valid.includes(normalized) ? normalized as LLMReRankResult['recommendation'] : 'CONSIDER';
}

/**
 * Calculate average LLM confidence for a batch of results
 */
export function calculateAverageConfidence(results: LLMReRankResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round(sum / results.length);
}

/**
 * Get distribution of recommendations
 */
export function getRecommendationDistribution(results: LLMReRankResult[]): Record<string, number> {
  const distribution: Record<string, number> = {
    HIGHLY_RECOMMENDED: 0,
    RECOMMENDED: 0,
    CONSIDER: 0,
    NOT_RECOMMENDED: 0,
  };

  for (const result of results) {
    distribution[result.recommendation]++;
  }

  return distribution;
}

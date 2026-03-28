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
  discAnalysis?: string;
  competencyAnalysis?: string;
  companyFitNotes?: string;
  fullAnalysis?: string;
}

export interface CandidateForReRank {
  candidate: CandidateData;
  factors: FactorScores;
  compositeScore: number;
}

// ============================================
// PROMPT TEMPLATES
// ============================================

const SYSTEM_PROMPT = `Você é um especialista sênior em recrutamento e seleção com profundo conhecimento em perfis comportamentais DISC e desenvolvimento pessoal (PDP).

Você analisa candidatos considerando três dimensões-chave:

1. **PERFIL DISC** — Você interpreta os 4 fatores (Dominante, Influente, Estável, Conforme) e entende como cada perfil se encaixa em diferentes funções:
   - **D (Dominante)**: Orientado a resultados, decisivo, competitivo. Ideal para liderança, vendas, gestão.
   - **I (Influente)**: Comunicativo, entusiasta, persuasivo. Ideal para atendimento, vendas, marketing, relações públicas.
   - **S (Estável)**: Paciente, colaborativo, leal. Ideal para suporte, trabalho em equipe, funções de cuidado.
   - **C (Conforme)**: Analítico, detalhista, preciso. Ideal para funções técnicas, qualidade, compliance, análise.

2. **COMPETÊNCIAS PDP** — Você avalia como as 10 principais competências do candidato se alinham com as necessidades da vaga.

3. **OBSERVAÇÕES DA EMPRESA** — Você lê as notas e observações da empresa sobre o que realmente buscam (além da descrição formal) e avalia o fit cultural e prático.

Responda APENAS em JSON válido:
{
  "refinedScore": <0-100>,
  "confidence": <0-100>,
  "discAnalysis": "<Parágrafo analisando como o perfil DISC do candidato se encaixa nesta vaga específica. Explique quais dimensões são fortes/fracas para o cargo.>",
  "competencyAnalysis": "<Parágrafo analisando como as competências PDP do candidato se alinham com os requisitos da vaga.>",
  "companyFitNotes": "<Parágrafo conectando o perfil do candidato com as observações específicas da empresa. Se não houver observações, analise o fit cultural geral.>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", ...],
  "concerns": ["<preocupação 1>", ...],
  "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER|NOT_RECOMMENDED>",
  "reasoning": "<Resumo geral de 3-5 frases integrando DISC, competências e fit com a empresa.>"
}

IMPORTANTE:
- Escreva análises profundas e específicas, NÃO genéricas
- Cite valores DISC específicos e competências PDP pelo nome
- Conecte as observações da empresa com o perfil do candidato
- Considere o contexto brasileiro de mercado de trabalho
- Seja inclusivo — valorize potencial e habilidades transferíveis`;

function getDominantDISC(candidate: CandidateData): string {
  const scores = [
    { name: 'Dominante (orientado a resultados)', val: candidate.disc_dominante || 0 },
    { name: 'Influente (comunicativo/persuasivo)', val: candidate.disc_influente || 0 },
    { name: 'Estável (paciente/colaborativo)', val: candidate.disc_estavel || 0 },
    { name: 'Conforme (analítico/detalhista)', val: candidate.disc_conforme || 0 },
  ].sort((a, b) => b.val - a.val);
  return `${scores[0].name} (${scores[0].val}%) + ${scores[1].name} (${scores[1].val}%)`;
}

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

  const discDominant = getDominantDISC(candidate);

  return `## VAGA: ${job.title}
${job.company_name ? `**Empresa:** ${job.company_name}` : ''}${job.company_industry ? ` (${job.company_industry})` : ''}
**Descrição:** ${job.description || 'Não especificada'}
**Tipo de Contrato:** ${job.contract_type} | **Trabalho:** ${job.work_type}
**Localização:** ${job.location || 'Não especificada'}
**Salário:** ${job.salary ? `R$ ${job.salary}` : 'Não informado'}${job.salary_max ? ` - R$ ${job.salary_max}` : ''}
**Educação Mínima:** ${job.min_education_level || 'Não especificada'}
**Habilidades Requeridas:** ${(job.required_skills || []).join(', ') || 'Não especificadas'}
**Experiência:** ${job.experience_required ? `Sim, mínimo ${job.min_experience_years || 0} anos` : 'Não obrigatória'}

${job.notes ? `### OBSERVAÇÕES DA EMPRESA (informação privilegiada sobre o que realmente buscam):\n${job.notes}` : ''}
${job.company_summary ? `### SOBRE A EMPRESA:\n${job.company_summary}` : ''}

---

## CANDIDATO: ${candidate.full_name}

**Localização:** ${candidate.city || '?'}, ${candidate.state || '?'}
**Educação:** ${candidate.education_level || 'Não informada'}
**Habilidades:** ${(candidate.skills || []).join(', ') || 'Não informadas'}

**Experiência:**
${formatExperience(candidate.experience)}

### PERFIL DISC (Comportamental)
- **Dominante (D):** ${candidate.disc_dominante ?? 'N/A'}% ${candidate.disc_dominante != null && candidate.disc_dominante >= 60 ? '⬆ ALTO' : ''}
- **Influente (I):** ${candidate.disc_influente ?? 'N/A'}% ${candidate.disc_influente != null && candidate.disc_influente >= 60 ? '⬆ ALTO' : ''}
- **Estável (S):** ${candidate.disc_estavel ?? 'N/A'}% ${candidate.disc_estavel != null && candidate.disc_estavel >= 60 ? '⬆ ALTO' : ''}
- **Conforme (C):** ${candidate.disc_conforme ?? 'N/A'}% ${candidate.disc_conforme != null && candidate.disc_conforme >= 60 ? '⬆ ALTO' : ''}
**Perfil dominante:** ${discDominant}

### COMPETÊNCIAS PDP (Top 10 - Pontos Fortes)
${(candidate.pdp_top_10_competencies || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'Não avaliadas'}

${candidate.pdp_develop_competencies?.length ? `### ÁREAS DE DESENVOLVIMENTO\n${candidate.pdp_develop_competencies.join(', ')}` : ''}

**Resumo:** ${candidate.summary || 'Sem resumo'}

---

## PONTUAÇÃO ALGORÍTMICA: ${compositeScore.toFixed(1)}/100
Skills: ${factors.skills} | Localização: ${factors.location} | Educação: ${factors.education} | Experiência: ${factors.experience} | Personalidade: ${factors.personality} | Competências: ${factors.competency}

---

Analise profundamente este candidato para esta vaga, focando no perfil DISC, competências PDP e fit com as observações da empresa. Responda em JSON.`;
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
      { temperature: 0.3, maxTokens: 2000 }
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

    const discAnalysis = String(parsed.discAnalysis || '');
    const competencyAnalysis = String(parsed.competencyAnalysis || '');
    const companyFitNotes = String(parsed.companyFitNotes || '');
    const reasoning = String(parsed.reasoning || '');
    const fullAnalysis = [discAnalysis, competencyAnalysis, companyFitNotes].filter(Boolean).join('\n\n');

    return {
      candidateId: candidate.id,
      refinedScore: Math.max(0, Math.min(100, Number(parsed.refinedScore) || compositeScore)),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 70)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      recommendation: validateRecommendation(parsed.recommendation),
      reasoning,
      discAnalysis,
      competencyAnalysis,
      companyFitNotes,
      fullAnalysis,
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
  const { concurrency = 2, onProgress } = options;
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

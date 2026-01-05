// AI Summary Generation Service
// Generates comprehensive summaries for candidates and jobs

import { generateWithGroq } from './groq';

// DISC Profile descriptions (same as frontend)
type DISCProfile = 'influente' | 'estavel' | 'dominante' | 'conforme';

interface ProfileDescription {
  title: string;
  focus: string;
  motivation: string;
  strengths: string[];
  risks: string[];
  communication: string;
}

const profileDescriptions: Record<DISCProfile, ProfileDescription> = {
  dominante: {
    title: "Dominante",
    focus: "Resultados, poder, controle",
    motivation: "Desafios, conquistas, autonomia",
    strengths: ["Decisão rápida", "Coragem", "Liderança direta"],
    risks: ["Impaciência", "Autoritarismo", "Pouca empatia"],
    communication: "Direta, objetiva, sem rodeios"
  },
  influente: {
    title: "Influente",
    focus: "Pessoas, comunicação, entusiasmo",
    motivation: "Reconhecimento, conexão, diversão",
    strengths: ["Persuasão", "Carisma", "Criatividade"],
    risks: ["Desorganização", "Impulsividade", "Superficialidade"],
    communication: "Emocional, expansiva, inspiradora"
  },
  estavel: {
    title: "Estável",
    focus: "Harmonia, segurança, constância",
    motivation: "Pertencimento, previsibilidade, cooperação",
    strengths: ["Lealdade", "Paciência", "Confiabilidade"],
    risks: ["Resistência à mudança", "Acomodação"],
    communication: "Calma, acolhedora, empática"
  },
  conforme: {
    title: "Conforme",
    focus: "Qualidade, regras, precisão",
    motivation: "Correção, lógica, excelência",
    strengths: ["Análise", "Organização", "Pensamento crítico"],
    risks: ["Perfeccionismo", "Rigidez", "Lentidão"],
    communication: "Técnica, detalhada, racional"
  }
};

interface CombinedProfile {
  name: string;
  description: string;
  traits: string[];
  risk: string;
  commonIn: string;
}

const combinedProfiles: Record<string, CombinedProfile> = {
  "dominante_influente": {
    name: "Dominante Influente",
    description: "Líder carismático e ousado",
    traits: ["Decide rápido e convence pessoas", "Visionário, motivador, competitivo"],
    risk: "Impulsividade e excesso de ego",
    commonIn: "Empreendedores, palestrantes e líderes comerciais"
  },
  "dominante_estavel": {
    name: "Dominante Estável",
    description: "Líder firme, porém humano",
    traits: ["Determinado, leal e protetor da equipe", "Mantém controle sem perder empatia"],
    risk: "Dificuldade em lidar com conflitos emocionais",
    commonIn: "Gestores respeitados e líderes maduros"
  },
  "dominante_conforme": {
    name: "Dominante Analítico",
    description: "Estratégico, exigente e orientado a excelência",
    traits: ["Cobra resultados com base em dados", "Perfeccionista e controlador"],
    risk: "Rigidez excessiva e intolerância a erros",
    commonIn: "Diretores, engenheiros, executivos técnicos"
  },
  "influente_dominante": {
    name: "Influente Dominante",
    description: "Comunicador poderoso e líder natural",
    traits: ["Inspira e move pessoas à ação", "Energético, confiante e persuasivo"],
    risk: "Atropelar processos e pessoas",
    commonIn: "Vendedores de alta performance"
  },
  "influente_estavel": {
    name: "Influente Estável",
    description: "Pessoa querida, acolhedora e comunicativa",
    traits: ["Excelente em relacionamentos e trabalho em equipe", "Evita conflitos, promove harmonia"],
    risk: "Dificuldade em dizer 'não'",
    commonIn: "RH, atendimento e educação"
  },
  "influente_conforme": {
    name: "Influente Analítico",
    description: "Criativo com lógica",
    traits: ["Comunica ideias complexas de forma simples", "Persuasivo, mas cuidadoso"],
    risk: "Conflito interno entre emoção e razão",
    commonIn: "Comunicadores estratégicos e consultores"
  },
  "estavel_dominante": {
    name: "Estável Dominante",
    description: "Liderança firme, porém paciente",
    traits: ["Determinado sem agressividade", "Sustenta resultados no longo prazo"],
    risk: "Demora para agir em crises",
    commonIn: "Líderes consistentes e confiáveis"
  },
  "estavel_influente": {
    name: "Estável Influente",
    description: "Amigável, empático e motivador",
    traits: ["Excelente ouvinte e facilitador", "Cria ambientes seguros e positivos"],
    risk: "Evitar decisões difíceis",
    commonIn: "Mediadores, coaches e líderes humanos"
  },
  "estavel_conforme": {
    name: "Estável Analítico",
    description: "Organizado, metódico e confiável",
    traits: ["Ama rotinas bem definidas", "Excelente executor e mantenedor de processos"],
    risk: "Resistência extrema à mudança",
    commonIn: "Áreas administrativas e qualidade"
  },
  "conforme_dominante": {
    name: "Analítico Dominante",
    description: "Extremamente estratégico e exigente",
    traits: ["Decide com base em dados", "Alto padrão de desempenho"],
    risk: "Frieza e controle excessivo",
    commonIn: "Gestores técnicos e estrategistas"
  },
  "conforme_influente": {
    name: "Analítico Influente",
    description: "Explica dados de forma envolvente",
    traits: ["Equilibra razão e carisma", "Influência com credibilidade"],
    risk: "Excesso de análise antes de agir",
    commonIn: "Professores, consultores e palestrantes técnicos"
  },
  "conforme_estavel": {
    name: "Analítico Estável",
    description: "Metódico, confiável e detalhista",
    traits: ["Excelente para manutenção e melhoria contínua", "Discreto, profundo e consistente"],
    risk: "Baixa flexibilidade",
    commonIn: "Especialistas e profissionais de alta precisão"
  }
};

// Candidate data structure for summary generation
interface CandidateSummaryInput {
  // Personal info
  fullName: string;
  city: string;
  state: string;
  educationLevel: string;
  institution?: string;
  course?: string;
  skills: string[];
  languages?: string[];

  // DISC profile
  discInfluente?: number;
  discEstavel?: number;
  discDominante?: number;
  discConforme?: number;

  // PDP results
  pdpIntrapersonal?: Record<string, string>;
  pdpInterpersonal?: Record<string, string>;
  pdpSkills?: Record<string, string[]>;
  pdpCompetencies?: string[];
  pdpTop10Competencies?: string[];
  pdpDevelopCompetencies?: string[];
}

// Job data structure for summary generation
interface JobSummaryInput {
  title: string;
  description: string;
  contractType: string;
  workType: string;
  city?: string;
  state?: string;
  requirements?: string;
  benefits?: string;
  salary?: string;
  companyName?: string;
}

// PDP Questions mapping for context
const pdpQuestionLabels: Record<string, string> = {
  '1': 'Quem e voce',
  '2': 'Maiores qualidades',
  '3': 'Maiores fraquezas',
  '4': 'Seu sonho',
  '5': 'Por que quer trabalhar',
  '6': 'Como lida com desafios',
  '7': 'Melhor falando ou ouvindo',
  '8': 'Desafios no trabalho',
  '9': 'Liderar ou ser liderado',
  '10': 'Ambientes calmos ou ativos',
  '11': 'Trabalho autonomo ou supervisao',
  '12': 'Concentracao em ambientes movimentados',
  '13': 'Ambiente de trabalho ideal',
  '14': 'Como as pessoas te descrevem',
  '15': 'Comportamento sob pressao',
  '16': 'Resolucao de conflitos',
  '17': 'Estilo de tomada de decisao',
};

function getDISCProfiles(candidate: CandidateSummaryInput): {
  primary: DISCProfile;
  secondary: DISCProfile | null;
  primaryValue: number;
  secondaryValue: number;
} {
  const profiles: { name: DISCProfile; value: number }[] = [
    { name: 'influente', value: candidate.discInfluente || 0 },
    { name: 'estavel', value: candidate.discEstavel || 0 },
    { name: 'dominante', value: candidate.discDominante || 0 },
    { name: 'conforme', value: candidate.discConforme || 0 },
  ];
  profiles.sort((a, b) => b.value - a.value);

  return {
    primary: profiles[0].name,
    secondary: profiles[1].value >= 15 ? profiles[1].name : null,
    primaryValue: profiles[0].value,
    secondaryValue: profiles[1].value,
  };
}

function buildDISCContext(candidate: CandidateSummaryInput): string {
  // Check if any DISC data is available
  const hasDiscData = (candidate.discDominante && candidate.discDominante > 0) ||
                      (candidate.discInfluente && candidate.discInfluente > 0) ||
                      (candidate.discEstavel && candidate.discEstavel > 0) ||
                      (candidate.discConforme && candidate.discConforme > 0);

  if (!hasDiscData) {
    return ''; // No DISC data available
  }

  const { primary, secondary, primaryValue, secondaryValue } = getDISCProfiles(candidate);
  const primaryInfo = profileDescriptions[primary];
  const secondaryInfo = secondary ? profileDescriptions[secondary] : null;
  const combinedKey = secondary ? `${primary}_${secondary}` : null;
  const combined = combinedKey ? combinedProfiles[combinedKey] : null;

  let context = `**Perfil Comportamental DISC:**
- Dominante: ${candidate.discDominante || 0}%
- Influente: ${candidate.discInfluente || 0}%
- Estável: ${candidate.discEstavel || 0}%
- Conforme: ${candidate.discConforme || 0}%

**Perfil Predominante: ${primaryInfo.title} (${primaryValue}%)**
- Foco: ${primaryInfo.focus}
- Motivação: ${primaryInfo.motivation}
- Forças: ${primaryInfo.strengths.join(', ')}
- Pontos de atenção: ${primaryInfo.risks.join(', ')}
- Estilo de comunicação: ${primaryInfo.communication}`;

  if (secondaryInfo) {
    context += `

**Perfil Secundário: ${secondaryInfo.title} (${secondaryValue}%)**
- Foco: ${secondaryInfo.focus}
- Forças: ${secondaryInfo.strengths.join(', ')}`;
  }

  if (combined) {
    context += `

**Perfil Combinado: ${combined.name}**
- Descrição: ${combined.description}
- Características: ${combined.traits.join('; ')}
- Principal risco: ${combined.risk}
- Comum em: ${combined.commonIn}`;
  }

  return context;
}

function formatPDPAnswers(
  intrapersonal?: Record<string, string>,
  interpersonal?: Record<string, string>
): string {
  const lines: string[] = [];

  if (intrapersonal) {
    for (const [key, value] of Object.entries(intrapersonal)) {
      const label = pdpQuestionLabels[key] || `Pergunta ${key}`;
      if (value && value.trim()) {
        lines.push(`- ${label}: ${value.trim()}`);
      }
    }
  }

  if (interpersonal) {
    for (const [key, value] of Object.entries(interpersonal)) {
      const label = pdpQuestionLabels[key] || `Pergunta ${key}`;
      if (value && value.trim()) {
        lines.push(`- ${label}: ${value.trim()}`);
      }
    }
  }

  return lines.join('\n');
}

export async function generateCandidateSummary(
  candidate: CandidateSummaryInput
): Promise<string> {
  const discContext = buildDISCContext(candidate);
  const pdpAnswers = formatPDPAnswers(
    candidate.pdpIntrapersonal,
    candidate.pdpInterpersonal
  );

  const systemPrompt = `Voce e um especialista em RH e recrutamento. Sua tarefa e criar um resumo profissional de um candidato para ajudar empresas a entender rapidamente seu perfil.

O resumo deve:
- Ser escrito em portugues brasileiro
- Ter entre 200-400 palavras (ajuste conforme a quantidade de informacoes disponiveis)
- Destacar pontos fortes e diferenciais
- Se houver dados de perfil DISC, descrever detalhadamente o perfil comportamental incluindo caracteristicas de lideranca, comunicacao e trabalho em equipe
- Se houver perfil combinado, explicar como essa combinacao se manifesta no ambiente de trabalho
- Se NAO houver dados de perfil DISC, focar nas habilidades tecnicas, formacao e experiencia
- Incluir competencias principais quando disponiveis
- Mencionar as areas onde o candidato se encaixaria melhor
- Criar um resumo util mesmo com informacoes limitadas
- Destacar as informacoes disponiveis de forma profissional
- Ser objetivo e profissional
- NAO inventar informacoes que nao foram fornecidas`;

  const userPrompt = `Crie um resumo profissional para este candidato:

**Informacoes Pessoais:**
- Nome: ${candidate.fullName}
- Localizacao: ${candidate.city}, ${candidate.state}
- Escolaridade: ${candidate.educationLevel}
${candidate.institution ? `- Instituicao: ${candidate.institution}` : ''}
${candidate.course ? `- Curso: ${candidate.course}` : ''}

**Habilidades Tecnicas:**
${candidate.skills.join(', ')}

${candidate.languages && candidate.languages.length > 0 ? `**Idiomas:**\n${candidate.languages.join(', ')}` : ''}

${discContext}

${candidate.pdpCompetencies && candidate.pdpCompetencies.length > 0 ? `**Competencias:**\n${candidate.pdpCompetencies.join(', ')}` : ''}

${candidate.pdpTop10Competencies && candidate.pdpTop10Competencies.length > 0 ? `**Top 10 Competencias Mais Fortes:**\n${candidate.pdpTop10Competencies.join(', ')}` : ''}

${candidate.pdpDevelopCompetencies && candidate.pdpDevelopCompetencies.length > 0 ? `**Competencias em Desenvolvimento:**\n${candidate.pdpDevelopCompetencies.join(', ')}` : ''}

${candidate.pdpSkills ? `**Habilidades Digitais:**\n${Object.entries(candidate.pdpSkills).map(([cat, skills]) => `${cat}: ${skills.join(', ')}`).join('\n')}` : ''}

${pdpAnswers ? `**Respostas do Perfil de Desenvolvimento:**\n${pdpAnswers}` : ''}

Crie um resumo profissional completo baseado nestas informacoes. Se houver dados de perfil DISC, destaque como o perfil comportamental influencia a forma de trabalhar, liderar e se comunicar. Caso contrario, foque nas habilidades tecnicas, formacao e potencial do candidato.`;

  const summary = await generateWithGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 1024 }
  );

  return summary;
}

export async function generateJobSummary(job: JobSummaryInput): Promise<string> {
  const systemPrompt = `Voce e um especialista em RH e recrutamento. Sua tarefa e criar um resumo conciso de uma vaga de emprego para ajudar no matching com candidatos.

O resumo deve:
- Ser escrito em portugues brasileiro
- Ter entre 150-200 palavras
- Destacar os requisitos principais
- Mencionar o tipo de perfil ideal
- Incluir informacoes sobre cultura e ambiente
- Ser objetivo e claro
- NAO inventar informacoes que nao foram fornecidas`;

  const userPrompt = `Crie um resumo para esta vaga:

**Titulo:** ${job.title}
${job.companyName ? `**Empresa:** ${job.companyName}` : ''}

**Descricao:**
${job.description}

**Tipo de Contrato:** ${job.contractType}
**Modelo de Trabalho:** ${job.workType}
${job.city && job.state ? `**Localizacao:** ${job.city}, ${job.state}` : ''}

${job.requirements ? `**Requisitos:**\n${job.requirements}` : ''}

${job.benefits ? `**Beneficios:**\n${job.benefits}` : ''}

${job.salary ? `**Salario:** ${job.salary}` : ''}

Crie um resumo conciso desta vaga focando no perfil ideal do candidato.`;

  const summary = await generateWithGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 512 }
  );

  return summary;
}

// Company data structure for summary generation
interface CompanySummaryInput {
  // Company basics
  companyName: string;
  cnpj?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  description?: string;

  // Location
  city?: string;
  state?: string;

  // Job context (from first job or company_forms)
  jobTitle?: string;
  contractType?: string;
  workType?: string;
  compensation?: string;
  mainActivities?: string;
  requiredSkills?: string;
  benefits?: string[];
  educationLevel?: string;

  // Additional context
  notes?: string;
}

export async function generateCompanySummary(
  company: CompanySummaryInput
): Promise<string> {
  const systemPrompt = `Voce e um especialista em RH e recrutamento. Sua tarefa e criar um resumo profissional de uma empresa para ajudar no matching com candidatos.

O resumo deve:
- Ser escrito em portugues brasileiro
- Ter entre 250-400 palavras
- Descrever o perfil da empresa e cultura organizacional
- Destacar o tipo de profissional ideal para a empresa
- Mencionar setor de atuacao e porte
- Incluir informacoes sobre vagas tipicas (se disponivel)
- Ser objetivo e profissional
- NAO inventar informacoes que nao foram fornecidas
- NAO incluir frases promocionais ou de call-to-action no final (como "se voce se identifica...", "candidate-se", etc.)
- Terminar de forma objetiva, sem convites ou apelos`;

  const userPrompt = `Crie um resumo profissional para esta empresa:

**Informacoes da Empresa:**
- Nome: ${company.companyName}
${company.industry ? `- Setor: ${company.industry}` : ''}
${company.companySize ? `- Porte: ${company.companySize} funcionarios` : ''}
${company.city && company.state ? `- Localizacao: ${company.city}, ${company.state}` : ''}
${company.website ? `- Website: ${company.website}` : ''}

${company.description ? `**Descricao:**\n${company.description}` : ''}

${company.jobTitle ? `**Vaga em Aberto:**
- Cargo: ${company.jobTitle}
${company.contractType ? `- Tipo de Contrato: ${company.contractType}` : ''}
${company.workType ? `- Modelo de Trabalho: ${company.workType}` : ''}
${company.compensation ? `- Remuneracao: ${company.compensation}` : ''}
${company.educationLevel ? `- Escolaridade: ${company.educationLevel}` : ''}
` : ''}

${company.mainActivities ? `**Atividades Principais:**\n${company.mainActivities}` : ''}

${company.requiredSkills ? `**Habilidades Requeridas:**\n${company.requiredSkills}` : ''}

${company.benefits && company.benefits.length > 0 ? `**Beneficios:**\n${company.benefits.join(', ')}` : ''}

${company.notes ? `**Observacoes:**\n${company.notes}` : ''}

Crie um resumo profissional que ajude a identificar candidatos ideais para esta empresa.`;

  const summary = await generateWithGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 512 }
  );

  return summary;
}

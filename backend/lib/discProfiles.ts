// Rule-based DISC interpretation — the source of truth for the interpretive
// analysis (Perfil Predominante / Secundário / Combinado) shown in the company
// candidate report (ANEC report item #7). Copied verbatim from the on-screen
// card frontend/src/components/candidate-card/CandidateCard.tsx (DISC_CONFIG +
// COMBINED_PROFILES + getDISCProfiles) so the PDF text matches the card exactly.
// Pure functions of the four DISC scores — no AI, no DB, no external calls.

export interface DiscProfileInfo {
  id: string;
  title: string;
  description: string;
  focus: string;
  motivation: string;
  strengths: string[];
  risks: string[];
  communication: string;
}

const DISC_PROFILE_INFO: Record<string, DiscProfileInfo> = {
  dominante: {
    id: "dominante",
    title: "Dominância",
    focus: "Resultados, poder, controle",
    motivation: "Desafios, conquistas, autonomia",
    strengths: ["Decisão rápida", "Coragem", "Liderança direta"],
    risks: ["Impaciência", "Autoritarismo", "Pouca empatia"],
    communication: "Direta, objetiva, sem rodeios",
    description: "Perfil orientado a resultados, direto e decisivo. Assume liderança e enfrenta desafios com determinação.",
  },
  influente: {
    id: "influente",
    title: "Influência",
    focus: "Pessoas, comunicação, entusiasmo",
    motivation: "Reconhecimento, conexão, diversão",
    strengths: ["Persuasão", "Carisma", "Criatividade"],
    risks: ["Desorganização", "Impulsividade", "Superficialidade"],
    communication: "Emocional, expansiva, inspiradora",
    description: "Perfil comunicativo e entusiasta. Motiva equipes e constrói relacionamentos com facilidade.",
  },
  estavel: {
    id: "estavel",
    title: "Estabilidade",
    focus: "Harmonia, segurança, constância",
    motivation: "Pertencimento, previsibilidade, cooperação",
    strengths: ["Lealdade", "Paciência", "Confiabilidade"],
    risks: ["Resistência à mudança", "Acomodação"],
    communication: "Calma, acolhedora, empática",
    description: "Perfil paciente e confiável. Trabalha bem em equipe e mantém estabilidade em ambientes de mudança.",
  },
  conforme: {
    id: "conforme",
    title: "Conformidade",
    focus: "Qualidade, regras, precisão",
    motivation: "Correção, lógica, excelência",
    strengths: ["Análise", "Organização", "Pensamento crítico"],
    risks: ["Perfeccionismo", "Rigidez", "Lentidão"],
    communication: "Técnica, detalhada, racional",
    description: "Perfil analítico e preciso. Valoriza qualidade, organização e atenção aos detalhes.",
  },
};

export interface DiscCombinedProfile {
  name: string;
  description: string;
  traits: string[];
  risk: string;
  commonIn: string;
}

const DISC_COMBINED_PROFILES: Record<string, DiscCombinedProfile> = {
  dominante_influente: { name: "Dominante Influente", description: "Líder carismático e ousado", traits: ["Decide rápido e convence pessoas", "Visionário, motivador, competitivo"], risk: "Impulsividade e excesso de ego", commonIn: "Empreendedores, palestrantes e líderes comerciais" },
  dominante_estavel: { name: "Dominante Estável", description: "Líder firme, porém humano", traits: ["Determinado, leal e protetor da equipe", "Mantém controle sem perder empatia"], risk: "Dificuldade em lidar com conflitos emocionais", commonIn: "Gestores respeitados e líderes maduros" },
  dominante_conforme: { name: "Dominante Analítico", description: "Estratégico, exigente e orientado a excelência", traits: ["Cobra resultados com base em dados", "Perfeccionista e controlador"], risk: "Rigidez excessiva e intolerância a erros", commonIn: "Diretores, engenheiros, executivos técnicos" },
  influente_dominante: { name: "Influente Dominante", description: "Comunicador poderoso e líder natural", traits: ["Inspira e move pessoas à ação", "Energético, confiante e persuasivo"], risk: "Atropelar processos e pessoas", commonIn: "Vendedores de alta performance" },
  influente_estavel: { name: "Influente Estável", description: "Pessoa querida, acolhedora e comunicativa", traits: ["Excelente em relacionamentos e trabalho em equipe", "Evita conflitos, promove harmonia"], risk: "Dificuldade em dizer 'não'", commonIn: "RH, atendimento e educação" },
  influente_conforme: { name: "Influente Analítico", description: "Criativo com lógica", traits: ["Comunica ideias complexas de forma simples", "Persuasivo, mas cuidadoso"], risk: "Conflito interno entre emoção e razão", commonIn: "Comunicadores estratégicos e consultores" },
  estavel_dominante: { name: "Estável Dominante", description: "Liderança firme, porém paciente", traits: ["Determinado sem agressividade", "Sustenta resultados no longo prazo"], risk: "Demora para agir em crises", commonIn: "Líderes consistentes e confiáveis" },
  estavel_influente: { name: "Estável Influente", description: "Amigável, empático e motivador", traits: ["Excelente ouvinte e facilitador", "Cria ambientes seguros e positivos"], risk: "Evitar decisões difíceis", commonIn: "Mediadores, coaches e líderes humanos" },
  estavel_conforme: { name: "Estável Analítico", description: "Organizado, metódico e confiável", traits: ["Ama rotinas bem definidas", "Excelente executor e mantenedor de processos"], risk: "Resistência extrema à mudança", commonIn: "Áreas administrativas e qualidade" },
  conforme_dominante: { name: "Analítico Dominante", description: "Extremamente estratégico e exigente", traits: ["Decide com base em dados", "Alto padrão de desempenho"], risk: "Frieza e controle excessivo", commonIn: "Gestores técnicos e estrategistas" },
  conforme_influente: { name: "Analítico Influente", description: "Explica dados de forma envolvente", traits: ["Equilibra razão e carisma", "Influência com credibilidade"], risk: "Excesso de análise antes de agir", commonIn: "Professores, consultores e palestrantes técnicos" },
  conforme_estavel: { name: "Analítico Estável", description: "Metódico, confiável e detalhista", traits: ["Excelente para manutenção e melhoria contínua", "Discreto, profundo e consistente"], risk: "Baixa flexibilidade", commonIn: "Especialistas e profissionais de alta precisão" },
};

export interface DiscInterpretation {
  primary: (DiscProfileInfo & { value: number }) | null;
  secondary: (DiscProfileInfo & { value: number }) | null;
  combined: DiscCombinedProfile | null;
}

// Mirrors getDISCProfiles in CandidateCard.tsx: sort the four scores desc, take
// the top as primary; the runner-up is "secondary" only if it scores >= 15;
// combined profile keyed `${primaryId}_${secondaryId}`. Returns nulls when the
// candidate has no DISC data.
export function computeDiscInterpretation(
  dominante?: number | null,
  influente?: number | null,
  estavel?: number | null,
  conforme?: number | null,
): DiscInterpretation {
  const scores = [
    { id: "dominante", value: dominante || 0 },
    { id: "influente", value: influente || 0 },
    { id: "estavel", value: estavel || 0 },
    { id: "conforme", value: conforme || 0 },
  ].sort((a, b) => b.value - a.value);

  if (scores[0].value <= 0) {
    return { primary: null, secondary: null, combined: null };
  }

  const primary = { ...DISC_PROFILE_INFO[scores[0].id], value: scores[0].value };
  const secondary = scores[1].value >= 15
    ? { ...DISC_PROFILE_INFO[scores[1].id], value: scores[1].value }
    : null;
  const combined = secondary
    ? DISC_COMBINED_PROFILES[`${scores[0].id}_${scores[1].id}`] || null
    : null;

  return { primary, secondary, combined };
}

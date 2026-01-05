// DISC Personality Assessment Questions
// Based on Ned Hermann's behavioral profile assessment

export type DISCProfile = 'influente' | 'estavel' | 'dominante' | 'conforme';

export interface DISCOption {
  profile: DISCProfile;
  text: string;
}

export interface DISCQuestion {
  id: number;
  question: string;
  options: DISCOption[];
}

// Detailed profile description interface
export interface ProfileDescription {
  title: string;
  letter: string;
  color: string;
  emoji: string;
  focus: string;
  motivation: string;
  strengths: string[];
  risks: string[];
  communication: string;
  typicalPhrase: string;
  summary: string;
}

// Combined profile interface
export interface CombinedProfile {
  name: string;
  description: string;
  traits: string[];
  risk: string;
  commonIn: string;
}

export const discQuestions: DISCQuestion[] = [
  {
    id: 1,
    question: "Eu sou...",
    options: [
      { profile: "influente", text: "Idealista, criativo e visionário" },
      { profile: "estavel", text: "Divertido, espiritual e benéfico" },
      { profile: "conforme", text: "Confiável, meticuloso e previsível" },
      { profile: "dominante", text: "Focado, determinado e persistente" },
    ]
  },
  {
    id: 2,
    question: "Eu gosto de...",
    options: [
      { profile: "dominante", text: "Ser piloto" },
      { profile: "estavel", text: "Conversar com os passageiros" },
      { profile: "conforme", text: "Planejar a viagem" },
      { profile: "influente", text: "Explorar novas rotas" },
    ]
  },
  {
    id: 3,
    question: "Se você quiser se dar bem comigo...",
    options: [
      { profile: "influente", text: "Me dê liberdade" },
      { profile: "conforme", text: "Me deixe saber sua expectativa" },
      { profile: "dominante", text: "Lidere, siga ou saia do caminho" },
      { profile: "estavel", text: "Seja amigável, carinhoso e compreensivo" },
    ]
  },
  {
    id: 4,
    question: "Para conseguir obter bons resultados é preciso...",
    options: [
      { profile: "influente", text: "Ter incertezas" },
      { profile: "conforme", text: "Controlar o essencial" },
      { profile: "estavel", text: "Diversão e celebração" },
      { profile: "dominante", text: "Planejar e obter recursos" },
    ]
  },
  {
    id: 5,
    question: "Eu me divirto quando...",
    options: [
      { profile: "dominante", text: "Estou me exercitando" },
      { profile: "influente", text: "Tenho novidades" },
      { profile: "estavel", text: "Estou com os outros" },
      { profile: "conforme", text: "Determino as regras" },
    ]
  },
  {
    id: 6,
    question: "Eu penso que...",
    options: [
      { profile: "estavel", text: "Unidos venceremos, divididos perderemos" },
      { profile: "dominante", text: "O ataque é melhor que a defesa" },
      { profile: "influente", text: "É bom ser manso, mas andar com um porrete" },
      { profile: "conforme", text: "Um homem prevenido vale por dois" },
    ]
  },
  {
    id: 7,
    question: "Minha preocupação é...",
    options: [
      { profile: "influente", text: "Gerar a ideia global" },
      { profile: "estavel", text: "Fazer com que as pessoas gostem" },
      { profile: "conforme", text: "Fazer com que funcione" },
      { profile: "dominante", text: "Fazer com que aconteça" },
    ]
  },
  {
    id: 8,
    question: "Eu prefiro...",
    options: [
      { profile: "influente", text: "Perguntas a respostas" },
      { profile: "conforme", text: "Ter todos os detalhes" },
      { profile: "dominante", text: "Vantagens a meu favor" },
      { profile: "estavel", text: "Que todos tenham a chance de serem ouvidos" },
    ]
  },
  {
    id: 9,
    question: "Eu gosto de...",
    options: [
      { profile: "dominante", text: "Fazer progresso" },
      { profile: "influente", text: "Construir memórias" },
      { profile: "conforme", text: "Fazer sentido" },
      { profile: "estavel", text: "Tornar as pessoas confortáveis" },
    ]
  },
  {
    id: 10,
    question: "Eu gosto de chegar...",
    options: [
      { profile: "dominante", text: "Na frente" },
      { profile: "estavel", text: "Junto" },
      { profile: "conforme", text: "Na hora" },
      { profile: "influente", text: "Em outro lugar" },
    ]
  },
  {
    id: 11,
    question: "Um ótimo dia para mim é quando...",
    options: [
      { profile: "dominante", text: "Consigo fazer muitas coisas" },
      { profile: "estavel", text: "Me divirto com meus amigos" },
      { profile: "conforme", text: "Tudo segue conforme planejado" },
      { profile: "influente", text: "Desfruto de coisas novas e estimulantes" },
    ]
  },
  {
    id: 12,
    question: "Eu vejo a morte como...",
    options: [
      { profile: "influente", text: "Uma grande aventura misteriosa" },
      { profile: "estavel", text: "Oportunidade para rever os falecidos" },
      { profile: "conforme", text: "Um modo de receber recompensas" },
      { profile: "dominante", text: "Algo que sempre chega muito cedo" },
    ]
  },
  {
    id: 13,
    question: "Minha filosofia de vida é...",
    options: [
      { profile: "dominante", text: "Há ganhadores e perdedores, e eu acredito ser um ganhador" },
      { profile: "estavel", text: "Para eu ganhar, ninguém precisa perder" },
      { profile: "conforme", text: "Para ganhar é preciso seguir as regras" },
      { profile: "influente", text: "Para ganhar, é necessário inventar novas regras" },
    ]
  },
  {
    id: 14,
    question: "Eu sempre gostei de...",
    options: [
      { profile: "influente", text: "Explorar" },
      { profile: "conforme", text: "Evitar surpresas" },
      { profile: "dominante", text: "Focalizar a meta" },
      { profile: "estavel", text: "Realizar uma abordagem natural" },
    ]
  },
  {
    id: 15,
    question: "Eu gosto de mudanças se...",
    options: [
      { profile: "dominante", text: "Me der uma vantagem competitiva" },
      { profile: "estavel", text: "For divertido e puder ser compartilhado" },
      { profile: "influente", text: "Me der mais liberdade e variedade" },
      { profile: "conforme", text: "Melhorar ou me der mais controle" },
    ]
  },
  {
    id: 16,
    question: "Não existe nada de errado em...",
    options: [
      { profile: "dominante", text: "Se colocar na frente" },
      { profile: "estavel", text: "Colocar os outros na frente" },
      { profile: "influente", text: "Mudar de ideia" },
      { profile: "conforme", text: "Ser consistente" },
    ]
  },
  {
    id: 17,
    question: "Eu gosto de buscar conselhos de...",
    options: [
      { profile: "dominante", text: "Pessoas bem-sucedidas" },
      { profile: "estavel", text: "Anciãos e conselheiros" },
      { profile: "conforme", text: "Autoridades no assunto" },
      { profile: "influente", text: "Lugares, os mais estranhos" },
    ]
  },
  {
    id: 18,
    question: "Meu lema e...",
    options: [
      { profile: "influente", text: "Fazer o que precisa ser feito" },
      { profile: "conforme", text: "Fazer bem feito" },
      { profile: "estavel", text: "Fazer junto com o grupo" },
      { profile: "dominante", text: "Simplesmente fazer" },
    ]
  },
  {
    id: 19,
    question: "Eu gosto de...",
    options: [
      { profile: "influente", text: "Complexidade, mesmo se confuso" },
      { profile: "conforme", text: "Ordem e sistematização" },
      { profile: "estavel", text: "Calor humano e animação" },
      { profile: "dominante", text: "Coisas claras e simples" },
    ]
  },
  {
    id: 20,
    question: "Tempo para mim é...",
    options: [
      { profile: "dominante", text: "Algo que detesto desperdicar" },
      { profile: "estavel", text: "Um grande ciclo" },
      { profile: "conforme", text: "Uma flecha que leva ao inevitável" },
      { profile: "influente", text: "Irrelevante" },
    ]
  },
  {
    id: 21,
    question: "Se eu fosse bilionário...",
    options: [
      { profile: "estavel", text: "Faria doações para muitas entidades" },
      { profile: "conforme", text: "Criaria uma poupança avantajada" },
      { profile: "influente", text: "Faria o que desse na cabeça" },
      { profile: "dominante", text: "Me exibiria bastante para algumas pessoas" },
    ]
  },
  {
    id: 22,
    question: "Eu acredito que...",
    options: [
      { profile: "dominante", text: "O destino e mais importante que a jornada" },
      { profile: "estavel", text: "A jornada e mais importante que o destino" },
      { profile: "conforme", text: "Um centavo economizado e um centavo ganho" },
      { profile: "influente", text: "Bastam um navio e uma estrela para navegar" },
    ]
  },
  {
    id: 23,
    question: "Eu acredito também que...",
    options: [
      { profile: "dominante", text: "Aquele que hesita está perdido" },
      { profile: "conforme", text: "De grão em grão a galinha enche o papo" },
      { profile: "estavel", text: "O que vai, volta" },
      { profile: "influente", text: "Um sorriso ou uma careta é o mesmo para quem é cego" },
    ]
  },
  {
    id: 24,
    question: "Eu acredito ainda que...",
    options: [
      { profile: "conforme", text: "É melhor prudência do que arrependimento" },
      { profile: "influente", text: "A autoridade deve ser desafiada" },
      { profile: "dominante", text: "Ganhar é fundamental" },
      { profile: "estavel", text: "O coletivo é mais importante do que o individual" },
    ]
  },
  {
    id: 25,
    question: "Eu penso que...",
    options: [
      { profile: "influente", text: "Não é fácil ficar encurralado" },
      { profile: "conforme", text: "É preferível olhar, antes de pular" },
      { profile: "estavel", text: "Duas cabeças pensam melhor do que uma" },
      { profile: "dominante", text: "Se você não tem condições de competir, não compita" },
    ]
  },
];

// Profile descriptions for results display
export const profileDescriptions: Record<DISCProfile, ProfileDescription> = {
  dominante: {
    title: "Dominante",
    letter: "D",
    color: "#EF4444", // Red
    emoji: "🔴",
    focus: "Resultados, poder, controle",
    motivation: "Desafios, conquistas, autonomia",
    strengths: ["Decisão rápida", "Coragem", "Liderança direta"],
    risks: ["Impaciência", "Autoritarismo", "Pouca empatia"],
    communication: "Direta, objetiva, sem rodeios",
    typicalPhrase: "Vamos resolver isso agora.",
    summary: "Orientado a resultados, competitivo e focado em ação. Busca eficiência."
  },
  influente: {
    title: "Influente",
    letter: "I",
    color: "#F97316", // Orange
    emoji: "🟠",
    focus: "Pessoas, comunicação, entusiasmo",
    motivation: "Reconhecimento, conexão, diversão",
    strengths: ["Persuasão", "Carisma", "Criatividade"],
    risks: ["Desorganização", "Impulsividade", "Superficialidade"],
    communication: "Emocional, expansiva, inspiradora",
    typicalPhrase: "Isso vai ser incrível!",
    summary: "Criativo, visionário e focado em ideias. Gosta de liberdade e novidades."
  },
  estavel: {
    title: "Estável",
    letter: "E",
    color: "#10B981", // Green
    emoji: "🟢",
    focus: "Harmonia, segurança, constância",
    motivation: "Pertencimento, previsibilidade, cooperação",
    strengths: ["Lealdade", "Paciência", "Confiabilidade"],
    risks: ["Resistência à mudança", "Acomodação"],
    communication: "Calma, acolhedora, empática",
    typicalPhrase: "Vamos fazer isso com calma.",
    summary: "Apoiador, orientado para equipe e harmonioso. Valoriza relacionamentos."
  },
  conforme: {
    title: "Conforme",
    letter: "C",
    color: "#3B82F6", // Blue
    emoji: "🔵",
    focus: "Qualidade, regras, precisão",
    motivation: "Correção, lógica, excelência",
    strengths: ["Análise", "Organização", "Pensamento crítico"],
    risks: ["Perfeccionismo", "Rigidez", "Lentidão"],
    communication: "Técnica, detalhada, racional",
    typicalPhrase: "Precisamos analisar melhor.",
    summary: "Organizado, detalhista e sistemático. Preza por qualidade e precisão."
  }
};

// Combined profiles for when two profiles are dominant
export const combinedProfiles: Record<string, CombinedProfile> = {
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

// Calculate DISC results from answers (normalized to 100%)
export function calculateDISCResults(answers: Record<number, DISCProfile>): Record<DISCProfile, number> {
  const counts: Record<DISCProfile, number> = {
    influente: 0,
    estavel: 0,
    dominante: 0,
    conforme: 0
  };

  Object.values(answers).forEach(profile => {
    counts[profile]++;
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  // If no answers, return equal distribution
  if (total === 0) {
    return { influente: 25, estavel: 25, dominante: 25, conforme: 25 };
  }

  // Normalize to 100%
  return {
    influente: Math.round((counts.influente / total) * 100),
    estavel: Math.round((counts.estavel / total) * 100),
    dominante: Math.round((counts.dominante / total) * 100),
    conforme: Math.round((counts.conforme / total) * 100)
  };
}

// Helper to get primary and secondary profiles
export function getTopTwoProfiles(results: Record<DISCProfile, number>): { primary: DISCProfile; secondary: DISCProfile | null } {
  const sorted = (Object.entries(results) as [DISCProfile, number][])
    .sort((a, b) => b[1] - a[1]);

  const primary = sorted[0][0];
  // Secondary profile must have at least 15% to be considered significant
  const secondary = sorted[1][1] >= 15 ? sorted[1][0] : null;

  return { primary, secondary };
}

// Get combined profile key
export function getCombinedProfileKey(primary: DISCProfile, secondary: DISCProfile | null): string | null {
  if (!secondary) return null;
  return `${primary}_${secondary}`;
}

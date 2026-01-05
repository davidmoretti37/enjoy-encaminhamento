// PDP (Personal Development Profile) Questions and Competencies

export interface PDPTextQuestion {
  id: number;
  section: 'intrapersonal' | 'interpersonal';
  question: string;
  placeholder?: string;
  minLength?: number;
}

export interface PDPMultipleChoiceQuestion {
  id: number;
  section: 'interpersonal';
  question: string;
  type: 'multiple_choice';
  options: string[];
}

export type PDPQuestion = PDPTextQuestion | PDPMultipleChoiceQuestion;

// Intrapersonal Questions (7 questions about self-knowledge)
export const pdpIntrapersonalQuestions: PDPTextQuestion[] = [
  {
    id: 1,
    section: 'intrapersonal',
    question: "Quem é você? Descreva suas características, interesses, valores e o que te torna único.",
    placeholder: "Fale sobre você, seus interesses, valores e o que te diferencia dos outros...",
    minLength: 50,
  },
  {
    id: 2,
    section: 'intrapersonal',
    question: "Quais são suas maiores qualidades? Liste pelo menos 5.",
    placeholder: "Ex: Sou comunicativo, responsável, criativo...",
    minLength: 30,
  },
  {
    id: 3,
    section: 'intrapersonal',
    question: "Quais são suas maiores fraquezas? Liste pelo menos 3 pontos a melhorar.",
    placeholder: "Ex: Preciso melhorar minha organização, tenho dificuldade em dizer não...",
    minLength: 30,
  },
  {
    id: 4,
    section: 'intrapersonal',
    question: "Qual é o seu sonho? O que você quer conquistar nos próximos anos?",
    placeholder: "Descreva seus objetivos e sonhos para o futuro...",
    minLength: 30,
  },
  {
    id: 5,
    section: 'intrapersonal',
    question: "Por que você quer começar a trabalhar agora? Quais são seus objetivos?",
    placeholder: "Explique suas motivações para entrar no mercado de trabalho...",
    minLength: 30,
  },
  {
    id: 6,
    section: 'intrapersonal',
    question: "Como você está lidando com seus desafios atualmente?",
    placeholder: "Descreva como enfrenta dificuldades no dia a dia...",
    minLength: 30,
  },
  {
    id: 7,
    section: 'intrapersonal',
    question: "Você é melhor falando ou ouvindo? Explique.",
    placeholder: "Reflita sobre seu estilo de comunicação...",
    minLength: 20,
  },
];

// Interpersonal Questions (10 questions about relationships and work style)
export const pdpInterpersonalQuestions: (PDPTextQuestion | PDPMultipleChoiceQuestion)[] = [
  {
    id: 8,
    section: 'interpersonal',
    question: "Como você lidaria com desafios no trabalho? (conflitos, mal-entendidos)",
    placeholder: "Descreva como resolveria situações difíceis no ambiente de trabalho...",
    minLength: 30,
  },
  {
    id: 9,
    section: 'interpersonal',
    question: "Você prefere liderar ou ser liderado? Explique.",
    placeholder: "Fale sobre sua preferência e por quê...",
    minLength: 20,
  },
  {
    id: 10,
    section: 'interpersonal',
    question: "Você prefere ambientes calmos ou ativos? Por quê?",
    placeholder: "Descreva o tipo de ambiente onde você trabalha melhor...",
    minLength: 20,
  },
  {
    id: 11,
    section: 'interpersonal',
    question: "Você prefere trabalho autônomo ou supervisão próxima? Por quê?",
    placeholder: "Explique como você prefere ser gerenciado...",
    minLength: 20,
  },
  {
    id: 12,
    section: 'interpersonal',
    question: "Você tem dificuldade de concentração em ambientes movimentados? Descreva seu espaço de trabalho ideal.",
    placeholder: "Fale sobre como o ambiente afeta sua produtividade...",
    minLength: 20,
  },
  {
    id: 13,
    section: 'interpersonal',
    question: "O que é essencial no seu ambiente de trabalho ideal?",
    placeholder: "Liste os elementos mais importantes para você...",
    minLength: 20,
  },
  {
    id: 14,
    section: 'interpersonal',
    question: "Como as pessoas te descrevem socialmente? (comunicativo, tímido, engraçado, etc.)",
    placeholder: "Descreva como os outros te veem...",
    minLength: 20,
  },
  {
    id: 15,
    section: 'interpersonal',
    question: "Como você se comporta sob pressão?",
    placeholder: "Descreva como reage em situações de estresse...",
    minLength: 20,
  },
  {
    id: 16,
    section: 'interpersonal',
    question: "Como você resolve conflitos com outras pessoas?",
    placeholder: "Descreva sua abordagem para resolver desentendimentos...",
    minLength: 20,
  },
  {
    id: 17,
    section: 'interpersonal',
    question: "Qual é seu estilo de tomada de decisão?",
    type: 'multiple_choice',
    options: [
      "Imediato - Decido rápido e sigo em frente",
      "Passivo - Prefiro que outros decidam",
      "Analítico - Analiso todas as opções antes de decidir",
      "Impulsivo - Sigo meu instinto",
    ],
  },
];

// Skills Categories
export interface SkillCategory {
  id: string;
  title: string;
  skills: string[];
}

export const pdpSkillCategories: SkillCategory[] = [
  {
    id: 'social_media',
    title: 'Redes Sociais',
    skills: ['Posts', 'Stories', 'Reels', 'Comentários', 'Hashtags', 'Lives'],
  },
  {
    id: 'digital_communication',
    title: 'Comunicação Digital',
    skills: ['WhatsApp', 'Email', 'Zoom', 'Google Meet'],
  },
  {
    id: 'video_image_editing',
    title: 'Edição de Vídeo/Imagem',
    skills: ['Canva', 'CapCut', 'Outro'],
  },
];

// 35 Competencies
export interface Competency {
  id: number;
  name: string;
  description: string;
}

export const pdpCompetencies: Competency[] = [
  { id: 1, name: "Ousadia", description: "Assumo riscos calculados" },
  { id: 2, name: "Persuasão", description: "Convenço pessoas" },
  { id: 3, name: "Empatia", description: "Me coloco no lugar do outro" },
  { id: 4, name: "Organização", description: "Mantenho tudo em ordem" },
  { id: 5, name: "Comando / Liderança", description: "Sei conduzir equipes" },
  { id: 6, name: "Extroversão", description: "Sou sociável" },
  { id: 7, name: "Paciência", description: "Sei esperar o momento certo" },
  { id: 8, name: "Detalhismo", description: "Presto atenção aos detalhes" },
  { id: 9, name: "Objetividade", description: "Vou direto ao ponto" },
  { id: 10, name: "Entusiasmo", description: "Sou animado" },
  { id: 11, name: "Persistência", description: "Não desisto fácil" },
  { id: 12, name: "Prudência", description: "Penso antes de agir" },
  { id: 13, name: "Assertividade", description: "Falo o que penso com respeito" },
  { id: 14, name: "Sociabilidade", description: "Faço amigos fácil" },
  { id: 15, name: "Planejamento", description: "Planejo antes de executar" },
  { id: 16, name: "Concentração", description: "Foco nas tarefas" },
  { id: 17, name: "Criatividade", description: "Tenho ideias novas" },
  { id: 18, name: "Inovação", description: "Gosto de fazer diferente" },
  { id: 19, name: "Resolver problemas", description: "Encontro soluções" },
  { id: 20, name: "Proatividade", description: "Tomo iniciativa" },
  { id: 21, name: "Pensamento crítico", description: "Analiso bem" },
  { id: 22, name: "Flexibilidade", description: "Me adapto fácil" },
  { id: 23, name: "Adaptabilidade", description: "Aceito mudanças" },
  { id: 24, name: "Resiliência", description: "Supero dificuldades" },
  { id: 25, name: "Comunicação", description: "Me expresso bem" },
  { id: 26, name: "Gerenciamento do tempo", description: "Administro bem meu tempo" },
  { id: 27, name: "Dedicação", description: "Me esforço muito" },
  { id: 28, name: "Determinação", description: "Vou até o fim" },
  { id: 29, name: "Comprometimento", description: "Cumpro o que prometo" },
  { id: 30, name: "Pontualidade", description: "Chego no horário" },
  { id: 31, name: "Agilidade", description: "Faço as coisas rápido" },
  { id: 32, name: "Facilidade para aprender", description: "Aprendo rápido" },
  { id: 33, name: "Trabalho em equipe", description: "Colaboro bem com outros" },
  { id: 34, name: "Atento aos detalhes", description: "Não deixo passar nada" },
  { id: 35, name: "Responsabilidade", description: "Assumo minhas obrigações" },
];

// PDP Data Types for storing results
export interface PDPResults {
  intrapersonal: Record<number, string>; // Question ID -> Answer
  interpersonal: Record<number, string>; // Question ID -> Answer
  skills: Record<string, string[]>; // Category ID -> Selected skills
  competencies: number[]; // Selected competency IDs
  topCompetencies: number[]; // Top 10 competencies (from selected)
  developCompetencies: number[]; // 5 competencies to develop
  actionPlans: Record<number, string[]>; // Competency ID -> 3 actions
}

// Helper function to get competency by ID
export function getCompetencyById(id: number): Competency | undefined {
  return pdpCompetencies.find(c => c.id === id);
}

// Helper function to get competency names from IDs
export function getCompetencyNames(ids: number[]): string[] {
  return ids.map(id => getCompetencyById(id)?.name || '').filter(Boolean);
}

// Canonical skill vocabulary for what ANEC actually places.
//
// THE PROBLEM THIS SOLVES
// scoreSkills() compares whole entries for equality after normalisation. Both
// sides of that comparison are free text typed by humans, so it almost never
// matched. Real production data:
//
//   job requirement:  "Ter interesse por moda e criação de conteúdo."
//   job requirement:  "Comunicativo organizado que goste de atender ao público
//                      trabalhe em equipe e consiga aprender para fazer vendas"
//   candidate skill:  "Atendimento ao cliente Comunicação eficaz Organização
//                      Trabalho em equipe Proatividade Responsabilidade"
//   candidate skill:  "Comunicativa" / "Boa comunicação" / "Comunicação" /
//                     "Comunicatica" (four spellings of one skill)
//
// Average skills score across a live matching run was 1.5 out of 100. Because
// the composite is dragged down with it, nothing ever crossed the LLM
// re-ranking threshold of 65 — the LLM stage has never run in production.
//
// The old skill_taxonomy table was meant to bridge this and held 29 rows, most
// of them developer skills: React, Angular, Docker, AWS, TypeScript. This agency
// places shop assistants, receptionists and office juniors.
//
// HOW THIS WORKS
// Every tag below carries the Portuguese wordings that actually appear in the
// data, matched with word boundaries against accent-stripped lowercase text. One
// free-text entry can therefore yield several tags, which is the point: a
// sentence listing six skills becomes six tags on both sides of the comparison.
//
// Deliberately NOT an LLM call. This runs on every job save and over the whole
// candidate base; it has to be deterministic, free, and testable. The LLM is
// better spent on the re-ranking stage this unblocks.

export interface SkillTag {
  /** Canonical id. Already in normalizeSkill() form: lowercase, no accents. */
  tag: string;
  /** Human label, for display and for seeding skill_taxonomy. */
  label: string;
  /** Wordings observed in production. Matched with word boundaries. */
  patterns: string[];
}

// Ordering matters only for readability; matching checks every tag.
export const SKILL_TAGS: SkillTag[] = [
  // ---- soft skills (the bulk of what both sides actually write) ----
  {
    tag: 'comunicacao', label: 'Comunicação',
    patterns: [
      'comunicacao', 'comunicativo', 'comunicativa', 'comunicatica', 'comunicacao boa',
      'boa comunicacao', 'otima comunicacao', 'comunicacao eficaz', 'comunicacao eficiente',
      'oratoria', 'se comunica bem', 'bom na comunicacao', 'relacionamento interpessoal',
      'escuta ativa', 'extroversao', 'lidar com diferentes perfis',
      'sociabilidade', 'sociavel',
      'relacoes interpessoais', 'gostar de conversar', 'desenvoltura',
    ],
  },
  {
    tag: 'proatividade', label: 'Proatividade',
    patterns: [
      'proatividade', 'proativo', 'proativa', 'pro atividade', 'pro ativo', 'pro ativa',
      'iniciativa', 'proatvidade',
    ],
  },
  {
    tag: 'organizacao', label: 'Organização',
    patterns: [
      'organizacao', 'organizado', 'organizada', 'senso organizacional', 'organizacional',
      'organizacao do ambiente',
    ],
  },
  {
    tag: 'trabalho-em-equipe', label: 'Trabalho em equipe',
    patterns: [
      'trabalho em equipe', 'trabalha em equipe', 'trabalhe em equipe', 'trabalhar em equipe',
      'trabalho de equipe', 'em equipe', 'colaborativo', 'colaboracao', 'espirito de equipe',
    ],
  },
  {
    tag: 'responsabilidade', label: 'Responsabilidade',
    patterns: [
      'responsabilidade', 'responsavel', 'comprometimento', 'comprometido', 'comprometida',
      'compromissado', 'compromissada', 'confiavel',
    ],
  },
  {
    tag: 'pontualidade', label: 'Pontualidade',
    patterns: ['pontualidade', 'pontual', 'assiduidade', 'assiduo'],
  },
  {
    tag: 'agilidade', label: 'Agilidade',
    patterns: [
      'agilidade', 'agil', 'rapidez', 'eficiencia e rapidez', 'dinamico', 'dinamica',
      'produtividade', 'produtivo', 'produtiva',
    ],
  },
  {
    tag: 'aprendizado-rapido', label: 'Facilidade de aprendizado',
    patterns: [
      'aprendizado rapido', 'aprendizagem rapida', 'aprende rapido', 'aprender rapido',
      'aprendo rapido', 'aprendo facil', 'aprendo com facilidade', 'facilidade em aprender',
      'facilidade para aprender', 'facilidade de aprendizado', 'facilidade de aprendizagem',
      'facilidade em aprendizado', 'agilidade em aprender', 'vontade de aprender',
      'aprendizado continuo', 'gosto de aprender', 'disposicao para aprender',
      'facil aprendizado', 'facil aprendizagem', 'disposto a aprender', 'aprender',
      'rapido aprendizado', 'aprendizado veloz',
      'estudioso', 'interesse em aprender', 'aprendo',
    ],
  },
  {
    tag: 'atendimento-ao-cliente', label: 'Atendimento ao cliente',
    patterns: [
      'atendimento ao cliente', 'atendimento ao publico', 'atendimento a o publico',
      'atendimento telefonico', 'atendimento whatsapp', 'atender ao publico', 'atender o publico',
      'atendimento', 'atendente', 'receptividade', 'cordialidade', 'sac', 'lidar com clientes',
      'bom com clientes', 'atencao ao cliente',
    ],
  },
  {
    tag: 'adaptabilidade', label: 'Adaptabilidade',
    patterns: ['adaptabilidade', 'adaptavel', 'adaptacao', 'adaptalidade', 'flexibilidade', 'flexivel'],
  },
  {
    tag: 'resolucao-de-problemas', label: 'Resolução de problemas',
    patterns: ['resolucao de problemas', 'resolver problemas', 'resolutivo', 'resolutiva', 'solucionar'],
  },
  {
    tag: 'simpatia', label: 'Simpatia e cordialidade',
    patterns: [
      'simpatia', 'simpatico', 'simpatica', 'gentil', 'gentileza', 'educado', 'educada',
      'boa educacao', 'carismatico', 'carismatica', 'alegre', 'extrovertido', 'extrovertida',
      'acolhedor', 'acolhedora', 'empatico', 'empatica', 'empatia', 'prestativo', 'prestativa',
      'simpatia no atendimento',
    ],
  },
  {
    tag: 'atencao-aos-detalhes', label: 'Atenção aos detalhes',
    patterns: [
      'atencao aos detalhes', 'atencao a detalhes', 'atencao', 'atencioso', 'atenciosa',
      'atento', 'atenta', 'concentrada', 'concentrado', 'concentracao', 'foco',
      'focada', 'focado', 'cuidadoso', 'cuidadosa', 'calmo', 'calma', 'paciencia', 'paciente',
      'analitica', 'analitico', 'detalhista', 'criteriosa', 'criterioso',
    ],
  },
  {
    tag: 'criatividade', label: 'Criatividade',
    patterns: ['criatividade', 'criativo', 'criativa'],
  },
  {
    tag: 'lideranca', label: 'Liderança',
    patterns: [
      'lideranca', 'lider', 'gestao de equipe', 'liderar', 'gestao ou lideranca',
      'gestao', 'gerencia', 'supervisao', 'coordenacao',
    ],
  },
  {
    tag: 'persistencia', label: 'Dedicação e persistência',
    patterns: [
      'persistente', 'persistencia', 'dedicado', 'dedicada', 'dedicacao', 'esforcado',
      'esforcada', 'determinacao', 'determinado', 'perseveranca', 'competente', 'competitivo',
      'empenhado', 'empenhada', 'corajoso', 'inovador', 'disponibilidade de horario',
    ],
  },
  {
    tag: 'apresentacao-pessoal', label: 'Boa apresentação pessoal',
    patterns: ['apresentacao pessoal', 'boa aparencia', 'discreto', 'discreta'],
  },

  // ---- hard skills ----
  {
    tag: 'informatica-basica', label: 'Informática básica',
    patterns: [
      'informatica basica', 'informatica', 'informatica basico', 'basico em informatica',
      'conhecimento basico em informatica', 'computacao', 'computador', 'basico sobre computador',
      'computacao basica', 'tecnologia', 'aptidao com tecnologia', 'bom com tecnologias',
      'ferramentas digitais', 'utilizar computador',
    ],
  },
  {
    tag: 'pacote-office', label: 'Pacote Office',
    patterns: ['pacote office', 'microsoft office', 'office 365', 'office'],
  },
  { tag: 'excel', label: 'Excel', patterns: ['excel', 'excell', 'planilhas', 'planilha'] },
  { tag: 'word', label: 'Word', patterns: ['word'] },
  { tag: 'powerpoint', label: 'PowerPoint', patterns: ['powerpoint', 'power point', 'apresentacoes'] },
  { tag: 'canva', label: 'Canva', patterns: ['canva'] },
  { tag: 'capcut', label: 'CapCut', patterns: ['capcut', 'cap cut'] },
  { tag: 'photoshop', label: 'Photoshop', patterns: ['photoshop', 'illustrator'] },
  {
    tag: 'redes-sociais', label: 'Redes sociais',
    patterns: [
      'redes sociais', 'rede social', 'instagram', 'tiktok', 'tik tok', 'facebook',
      'social media', 'midias sociais', 'social selling',
    ],
  },
  {
    tag: 'criacao-de-conteudo', label: 'Criação de conteúdo',
    patterns: [
      'criacao de conteudo', 'producao de conteudo', 'ugc', 'edicao de video',
      'copywriting', 'edicao', 'fotografia', 'fotografo', 'design', 'desenho', 'desenhar',
    ],
  },
  {
    tag: 'marketing-digital', label: 'Marketing digital',
    patterns: ['marketing digital', 'marketing', 'trafego pago', 'anuncios'],
  },
  {
    tag: 'vendas', label: 'Vendas',
    patterns: [
      'vendas', 'vendedor', 'vendedora', 'comercial', 'prospeccao', 'funil de vendas',
      'inbound sales', 'outbound', 'negociacao',
    ],
  },
  {
    tag: 'operacao-de-caixa', label: 'Operação de caixa',
    patterns: ['operacao de caixa', 'operador de caixa', 'caixa', 'frente de caixa', 'pdv'],
  },
  {
    tag: 'controle-de-estoque', label: 'Controle de estoque',
    patterns: ['controle de estoque', 'estoque', 'estoquista', 'inventario', 'reposicao'],
  },
  {
    tag: 'rotinas-administrativas', label: 'Rotinas administrativas',
    patterns: [
      'rotinas administrativas', 'administrativo', 'administracao', 'apoio administrativo',
      'auxiliar administrativo', 'escritorio',
    ],
  },
  {
    tag: 'matematica-basica', label: 'Matemática básica',
    patterns: [
      'contas simples', 'bom calculo', 'calculo', 'matematica', 'nocao de medidas',
      'somas de matematica', 'raciocinio logico',
    ],
  },
  {
    tag: 'boa-escrita', label: 'Boa escrita',
    patterns: [
      'boa escrita', 'comunicacao escrita', 'boa comunicacao escrita', 'redacao',
      'ortografia', 'escrita', 'digitacao', 'digitar rapido',
    ],
  },
  {
    tag: 'ia', label: 'Ferramentas de IA',
    patterns: ['inteligencia artificial', 'ferramentas de ia', 'chatgpt', 'conhecimento de ia', 'ia'],
  },
  { tag: 'crm', label: 'CRM', patterns: ['crm', 'automacao de vendas'] },
  { tag: 'banco-de-dados', label: 'Banco de dados', patterns: ['banco de dados', 'sql'] },
  { tag: 'email-internet', label: 'E-mail e internet', patterns: ['e mail', 'email', 'internet', 'navegador'] },
  { tag: 'whatsapp', label: 'WhatsApp', patterns: ['whatsapp', 'whats app'] },
  { tag: 'cnh', label: 'CNH', patterns: ['habilitacao', 'cnh', 'carteira de motorista', 'carta de conducao'] },
  {
    tag: 'programacao', label: 'Programação',
    patterns: [
      'programador', 'programadora', 'programacao', 'desenvolvedor', 'desenvolvedora',
      'python', 'java', 'javascript', 'java script', 'typescript', 'php', 'react',
      'desenvolvimento web', 'desenvolvimento de software', 'git', 'github',
    ],
  },
  {
    tag: 'idiomas', label: 'Idiomas',
    patterns: ['ingles', 'espanhol', 'idiomas', 'segundo idioma', 'bilingue'],
  },
  { tag: 'analise-de-dados', label: 'Análise de dados', patterns: ['analise de dados', 'analitico', 'indicadores', 'metricas'] },
];

/**
 * Same normalisation scoreSkills() applies, so tags compare byte-for-byte
 * against whatever the scorer derives from stored values.
 */
export function normalizeSkillText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Entries that carry no skill information. Left untagged rather than guessed at.
const NOISE = new Set([
  'nenhuma', 'nenhum', 'na', 'n a', 'competencias requeriads', 'competencias requeridas',
  'a', 'x', '-', 'cursando ensino medio', 'cursando o ensino medio', 'ensino medio',
  'ensino medio completo', 'ensino medio incompleto', 'superior', 'nao', 'sim',
]);

const COMPILED: { tag: string; re: RegExp }[] = SKILL_TAGS.flatMap((s) =>
  // Longest patterns first so "boa comunicacao escrita" wins over "comunicacao"
  // when both could fire — they both still tag, this only affects readability of
  // debugging output, not correctness.
  [...s.patterns]
    .sort((a, b) => b.length - a.length)
    .map((p) => ({
      tag: s.tag,
      // Word boundaries: without them "ia" matches inside "familia", "sac"
      // inside "sacola", and every entry collects junk tags.
      re: new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`),
    })),
);

/**
 * Turn free-text skill entries into canonical tags.
 *
 * One entry may produce many tags — a candidate who wrote all eight of their
 * skills into a single box gets all eight, which is exactly the case that
 * previously scored zero.
 */
export function extractSkillTags(entries: (string | null | undefined)[]): string[] {
  const found = new Set<string>();

  for (const raw of entries) {
    if (!raw) continue;

    // Strip the JSON-fragment debris left by earlier import bugs: entries like
    // '["Comunicativo', 'proativo"]', 'trabalha bem em equipe."]', plus bullets,
    // tabs and newlines that were never separators to begin with.
    const cleaned = raw
      .replace(/^\s*\[?"?/, '')
      .replace(/"?\]?\s*$/, '')
      // Some rows hold the two-character sequence backslash-n, not a newline —
      // escape sequences that were stringified into the data by an old import.
      // Left alone, the trailing letter fuses onto the next word: "\tFacilidade"
      // normalises to "tfacilidade" and no pattern can match it.
      .replace(/\\[ntr]/g, ' ')
      .replace(/[•◦·\t]/g, ' ');

    const text = normalizeSkillText(cleaned);
    if (!text || text.length < 2 || NOISE.has(text)) continue;

    // Pad so ^/$ boundaries also fire for single-token entries.
    const padded = ` ${text} `;
    for (const { tag, re } of COMPILED) {
      if (found.has(tag)) continue;
      if (re.test(padded)) found.add(tag);
    }
  }

  return [...found].sort();
}

/** Human labels for a set of tags, for display. */
export function labelsForTags(tags: string[]): string[] {
  const byTag = new Map(SKILL_TAGS.map((s) => [s.tag, s.label]));
  return tags.map((t) => byTag.get(t) || t);
}

/**
 * Tags for a job, from whichever field actually holds its requirements.
 *
 * The agency edits the "Requisitos" textarea, which writes jobs.requirements.
 * Matching reads jobs.required_skills, which only creation populates — so
 * editing a vaga's requirements never once changed who it matched. Prefer the
 * structured list when there is one (it is tighter, and scoreSkills divides by
 * the number of required tags, so a bloated list depresses every score), and
 * fall back to the prose the operator actually typed.
 */
export function deriveJobSkillTags(
  requiredSkills: (string | null | undefined)[] | null | undefined,
  requirementsText?: string | null,
): string[] {
  const fromList = extractSkillTags(requiredSkills || []);
  if (fromList.length) return fromList;
  return extractSkillTags([requirementsText]);
}

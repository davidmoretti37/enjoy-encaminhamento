/**
 * AI-Powered Excel Parser Service
 *
 * Uses LLM to understand Excel structure and extract candidate data automatically.
 * No manual column mapping required.
 */

import { invokeLLM } from "../../_core/llm";

// Available fields that can be extracted
const AVAILABLE_FIELDS: Record<string, string> = {
  // Required
  full_name: "Nome completo do candidato",
  cpf: "CPF - documento com 11 dígitos numéricos",
  email: "Email do candidato",

  // Basic info
  phone: "Telefone ou celular",
  date_of_birth: "Data de nascimento",
  address: "Endereço completo ou rua",
  city: "Cidade",
  state: "Estado ou UF (2 letras)",
  zip_code: "CEP - código postal",

  // Education
  education_level: "Nível de escolaridade",
  institution: "Instituição de ensino",
  course: "Curso ou área de estudo",
  currently_studying: "Se está estudando atualmente",

  // Skills
  skills: "Habilidades técnicas (lista)",
  languages: "Idiomas (lista)",
  has_work_experience: "Se tem experiência de trabalho",

  // Availability
  available_for_internship: "Disponível para estágio",
  available_for_clt: "Disponível para CLT",
  available_for_apprentice: "Disponível para jovem aprendiz",
  preferred_work_type: "Modalidade preferida (presencial/remoto/híbrido)",

  // DISC Profile
  disc_dominante: "Perfil DISC - Dominante (0-100)",
  disc_influente: "Perfil DISC - Influente (0-100)",
  disc_estavel: "Perfil DISC - Estável (0-100)",
  disc_conforme: "Perfil DISC - Conforme (0-100)",

  // PDP Intrapersonal (Questions 1-6)
  pdp_q1: "Quem é você?",
  pdp_q2: "Quais são suas maiores qualidades?",
  pdp_q3: "Quais são suas maiores fraquezas?",
  pdp_q4: "Qual é seu sonho?",
  pdp_q5: "Por que você quer trabalhar?",
  pdp_q6: "Como você lida com desafios?",

  // PDP Interpersonal (Questions 7-17)
  pdp_q7: "Você é melhor falando ou ouvindo?",
  pdp_q8: "Quais são seus maiores desafios no trabalho?",
  pdp_q9: "Prefere liderar ou ser liderado?",
  pdp_q10: "Prefere ambientes calmos ou ativos?",
  pdp_q11: "Prefere trabalho autônomo ou com supervisão?",
  pdp_q12: "Consegue se concentrar em ambientes movimentados?",
  pdp_q13: "Descreva seu ambiente de trabalho ideal",
  pdp_q14: "Como as pessoas te descrevem?",
  pdp_q15: "Como você se comporta sob pressão?",
  pdp_q16: "Como você resolve conflitos?",
  pdp_q17: "Qual é seu estilo de tomada de decisão?",

  // Competencies
  pdp_competencies: "Competências PDP (lista)",

  // Other
  profile_summary: "Resumo ou bio do candidato",
};

// Schema type: maps Excel column names to our field names
export type ColumnSchema = Record<string, string>;

export interface ParsedCandidateFromAI {
  full_name: string;
  cpf: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  education_level?: string;
  institution?: string;
  course?: string;
  currently_studying?: boolean;
  skills?: string[];
  languages?: string[];
  has_work_experience?: boolean;
  available_for_internship?: boolean;
  available_for_clt?: boolean;
  available_for_apprentice?: boolean;
  preferred_work_type?: string;
  disc_dominante?: number;
  disc_influente?: number;
  disc_estavel?: number;
  disc_conforme?: number;
  pdp_intrapersonal?: Record<string, string>;
  pdp_interpersonal?: Record<string, string>;
  pdp_competencies?: string[];
  profile_summary?: string;
  // Validation
  _rowNumber: number;
  _isValid: boolean;
  _errors: string[];
}

/**
 * Step 1: AI analyzes sample data and returns a column schema
 */
async function detectColumnSchema(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnSchema> {
  // Build column info with samples
  const columnsInfo = headers.map((header, index) => {
    const samples = sampleRows
      .map((row) => row[header])
      .filter((v) => v !== undefined && v !== null && v !== "")
      .slice(0, 3);

    return `"${header}": [${samples.map((s) => `"${String(s).substring(0, 50)}"`).join(", ")}]`;
  }).join("\n");

  const fieldsInfo = Object.entries(AVAILABLE_FIELDS)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join("\n");

  const systemPrompt = `Você analisa planilhas Excel para identificar quais colunas correspondem a campos de candidato.

Campos disponíveis:
${fieldsInfo}

Regras:
- CPF tem 11 dígitos
- Email contém @
- Telefone tem 10-11 dígitos
- DISC são números 0-100
- pdp_q1 a pdp_q6 são perguntas intrapessoais
- pdp_q7 a pdp_q17 são perguntas interpessoais
- Se não conseguir identificar, não inclua no mapeamento`;

  const userPrompt = `Analise estas colunas e seus valores de exemplo:

${columnsInfo}

Retorne um JSON mapeando nome_da_coluna -> nome_do_campo.
Exemplo: {"Nome do Aluno": "full_name", "CPF": "cpf", "E-mail": "email"}

Apenas inclua colunas que você consegue identificar com certeza.`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.error("[ColumnMapper] Empty response from LLM");
      return {};
    }

    const schema = JSON.parse(content) as ColumnSchema;

    // Validate schema - only keep valid field mappings
    const validFields = new Set(Object.keys(AVAILABLE_FIELDS));
    const cleanedSchema: ColumnSchema = {};

    for (const [column, field] of Object.entries(schema)) {
      if (validFields.has(field) && headers.includes(column)) {
        cleanedSchema[column] = field;
      }
    }

    console.log(`[ColumnMapper] Detected schema: ${Object.keys(cleanedSchema).length} fields mapped`);
    return cleanedSchema;
  } catch (error) {
    console.error("[ColumnMapper] Failed to detect schema:", error);
    return {};
  }
}

/**
 * Step 2: Apply schema to parse all rows locally
 */
function applySchemaToRows(
  schema: ColumnSchema,
  rows: Record<string, string>[]
): ParsedCandidateFromAI[] {
  const candidates: ParsedCandidateFromAI[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const candidate: ParsedCandidateFromAI = {
      full_name: "",
      cpf: "",
      email: "",
      _rowNumber: i + 2, // +2 because row 1 is header
      _isValid: true,
      _errors: [],
    };

    // Collect PDP answers
    const pdpIntrapersonal: Record<string, string> = {};
    const pdpInterpersonal: Record<string, string> = {};

    // Apply schema mapping
    for (const [column, field] of Object.entries(schema)) {
      const value = row[column];
      if (!value || value.trim() === "") continue;

      const trimmedValue = value.trim();

      // Handle PDP questions
      if (field.startsWith("pdp_q")) {
        const qNum = parseInt(field.replace("pdp_q", ""), 10);
        if (qNum >= 1 && qNum <= 6) {
          pdpIntrapersonal[String(qNum)] = trimmedValue;
        } else if (qNum >= 7 && qNum <= 17) {
          pdpInterpersonal[String(qNum)] = trimmedValue;
        }
        continue;
      }

      // Handle different field types
      switch (field) {
        case "full_name":
        case "email":
        case "phone":
        case "address":
        case "city":
        case "state":
        case "zip_code":
        case "institution":
        case "course":
        case "profile_summary":
        case "preferred_work_type":
          (candidate as any)[field] = trimmedValue;
          break;

        case "cpf":
          candidate.cpf = trimmedValue.replace(/\D/g, "");
          break;

        case "date_of_birth":
          candidate.date_of_birth = parseDate(trimmedValue);
          break;

        case "education_level":
          candidate.education_level = parseEducationLevel(trimmedValue);
          break;

        case "currently_studying":
        case "has_work_experience":
        case "available_for_internship":
        case "available_for_clt":
        case "available_for_apprentice":
          (candidate as any)[field] = parseBoolean(trimmedValue);
          break;

        case "disc_dominante":
        case "disc_influente":
        case "disc_estavel":
        case "disc_conforme":
          const numValue = parseInt(trimmedValue.replace(/[^\d]/g, ""), 10);
          if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            (candidate as any)[field] = numValue;
          }
          break;

        case "skills":
        case "languages":
        case "pdp_competencies":
          (candidate as any)[field] = trimmedValue.split(/[,;]/).map((s) => s.trim()).filter((s) => s);
          break;
      }
    }

    // Store PDP data
    if (Object.keys(pdpIntrapersonal).length > 0) {
      candidate.pdp_intrapersonal = pdpIntrapersonal;
    }
    if (Object.keys(pdpInterpersonal).length > 0) {
      candidate.pdp_interpersonal = pdpInterpersonal;
    }

    // Validate required fields
    if (!candidate.full_name) {
      candidate._isValid = false;
      candidate._errors.push("Nome não encontrado");
    }
    if (!candidate.cpf) {
      candidate._isValid = false;
      candidate._errors.push("CPF não encontrado");
    } else if (candidate.cpf.length !== 11) {
      candidate._isValid = false;
      candidate._errors.push(`CPF inválido (${candidate.cpf.length} dígitos)`);
    }
    if (!candidate.email) {
      candidate._isValid = false;
      candidate._errors.push("Email não encontrado");
    } else if (!candidate.email.includes("@")) {
      candidate._isValid = false;
      candidate._errors.push("Email inválido");
    }

    candidates.push(candidate);
  }

  return candidates;
}

/**
 * Main function: AI parses Excel and returns candidates
 */
export async function parseExcelWithAI(
  headers: string[],
  rows: Record<string, string>[]
): Promise<{
  candidates: ParsedCandidateFromAI[];
  schema: ColumnSchema;
  mappedFields: string[];
}> {
  // Get sample rows for AI analysis (first 5)
  const sampleRows = rows.slice(0, 5);

  // Step 1: AI detects column schema
  const schema = await detectColumnSchema(headers, sampleRows);

  // Step 2: Apply schema to all rows locally
  const candidates = applySchemaToRows(schema, rows);

  const mappedFields = Array.from(new Set(Object.values(schema)));
  console.log(`[ColumnMapper] Parsed ${candidates.length} candidates, ${candidates.filter(c => c._isValid).length} valid`);

  return {
    candidates,
    schema,
    mappedFields,
  };
}

// Helper functions
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ["sim", "yes", "s", "y", "1", "true", "x", "verdadeiro"].includes(normalized);
}

function parseDate(value: string): string | undefined {
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD (ISO)
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      if (format === formats[2]) return value;
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  return undefined;
}

function parseEducationLevel(value: string): string | undefined {
  const normalized = value.toLowerCase().trim();
  const mappings: Record<string, string> = {
    fundamental: "fundamental",
    "ensino fundamental": "fundamental",
    medio: "medio",
    médio: "medio",
    "ensino medio": "medio",
    "ensino médio": "medio",
    superior: "superior",
    "ensino superior": "superior",
    graduacao: "superior",
    graduação: "superior",
    faculdade: "superior",
    "pos-graduacao": "pos-graduacao",
    "pós-graduação": "pos-graduacao",
    especializacao: "pos-graduacao",
    especialização: "pos-graduacao",
    mba: "pos-graduacao",
    mestrado: "mestrado",
    doutorado: "doutorado",
    phd: "doutorado",
  };
  return mappings[normalized];
}

// Keep old function for backwards compatibility
export async function suggestColumnMappings(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<{ mappings: Record<string, string>; confidence: Record<string, "high" | "medium" | "low"> }> {
  const schema = await detectColumnSchema(headers, sampleRows);
  const confidence: Record<string, "high" | "medium" | "low"> = {};
  for (const key of Object.keys(schema)) {
    confidence[key] = "high";
  }
  return { mappings: schema, confidence };
}

/**
 * NEW SIMPLIFIED APPROACH
 * Only identifies the 3 essential columns: name, cpf, email
 * Everything else is stored as raw data
 */
export interface BasicColumnIdentification {
  nameColumn: string | null;
  cpfColumn: string | null;
  emailColumn: string | null;
}

export async function identifyBasicColumns(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<BasicColumnIdentification> {
  // Build column info with samples for AI
  const columnsInfo = headers.map((header) => {
    const samples = sampleRows
      .map((row) => row[header])
      .filter((v) => v !== undefined && v !== null && v !== "")
      .slice(0, 3);

    return `"${header}": [${samples.map((s) => `"${String(s).substring(0, 60)}"`).join(", ")}]`;
  }).join("\n");

  const systemPrompt = `Você analisa colunas de planilhas Excel para identificar informações básicas de pessoas.

Sua tarefa é identificar APENAS 3 colunas:
1. nameColumn: Qual coluna contém o NOME COMPLETO da pessoa?
2. cpfColumn: Qual coluna contém o CPF (documento brasileiro com 11 dígitos)?
3. emailColumn: Qual coluna contém o EMAIL?

Dicas:
- CPF tem 11 dígitos numéricos (pode estar formatado como 123.456.789-00)
- Email sempre contém @ e um domínio
- Nome é texto com nome e sobrenome

Se não conseguir identificar uma coluna, retorne null para ela.`;

  const userPrompt = `Analise estas colunas e seus exemplos de valores:

${columnsInfo}

Retorne APENAS um JSON com este formato exato:
{
  "nameColumn": "nome_exato_da_coluna_ou_null",
  "cpfColumn": "nome_exato_da_coluna_ou_null",
  "emailColumn": "nome_exato_da_coluna_ou_null"
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.error("[ColumnMapper] Empty response from LLM");
      return { nameColumn: null, cpfColumn: null, emailColumn: null };
    }

    const parsed = JSON.parse(content) as BasicColumnIdentification;

    // Validate that returned columns actually exist in headers
    const result2: BasicColumnIdentification = {
      nameColumn: parsed.nameColumn && headers.includes(parsed.nameColumn) ? parsed.nameColumn : null,
      cpfColumn: parsed.cpfColumn && headers.includes(parsed.cpfColumn) ? parsed.cpfColumn : null,
      emailColumn: parsed.emailColumn && headers.includes(parsed.emailColumn) ? parsed.emailColumn : null,
    };

    console.log(`[ColumnMapper] Identified columns: name="${result2.nameColumn}", cpf="${result2.cpfColumn}", email="${result2.emailColumn}"`);

    return result2;
  } catch (error) {
    console.error("[ColumnMapper] Failed to identify basic columns:", error);
    return { nameColumn: null, cpfColumn: null, emailColumn: null };
  }
}

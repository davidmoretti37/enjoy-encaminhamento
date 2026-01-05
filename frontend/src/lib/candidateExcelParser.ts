/**
 * Excel/CSV Parser for Candidate Import
 *
 * Parses Excel (.xlsx, .xls) and CSV files and maps columns to candidate fields
 * Supports custom column mapping for flexible imports
 */

import * as XLSX from 'xlsx';

export interface ParsedCandidate {
  full_name: string;
  cpf: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | 'mestrado' | 'doutorado';
  currently_studying?: boolean;
  institution?: string;
  course?: string;
  skills?: string[];
  languages?: string[];
  has_work_experience?: boolean;
  profile_summary?: string;
  available_for_internship?: boolean;
  available_for_clt?: boolean;
  available_for_apprentice?: boolean;
  preferred_work_type?: 'presencial' | 'remoto' | 'hibrido';
  // DISC profile
  disc_dominante?: number;
  disc_influente?: number;
  disc_estavel?: number;
  disc_conforme?: number;
  // PDP data
  pdp_competencies?: string[];
  pdp_intrapersonal?: Record<string, string>;
  pdp_interpersonal?: Record<string, string>;
  // Validation
  _rowNumber: number;
  _isValid: boolean;
  _errors: string[];
  _warnings: string[];
}

// Column mapping type: Excel column name → field key
export type ColumnMapping = Record<string, string>;

// All candidate fields that can be mapped
export const CANDIDATE_FIELDS: Record<string, { label: string; required?: boolean; group: string }> = {
  // Required fields
  full_name: { label: 'Nome Completo', required: true, group: 'Informações Básicas' },
  cpf: { label: 'CPF', required: true, group: 'Informações Básicas' },
  email: { label: 'Email', required: true, group: 'Informações Básicas' },

  // Basic info
  phone: { label: 'Telefone', group: 'Informações Básicas' },
  date_of_birth: { label: 'Data de Nascimento', group: 'Informações Básicas' },
  address: { label: 'Endereço', group: 'Informações Básicas' },
  city: { label: 'Cidade', group: 'Informações Básicas' },
  state: { label: 'Estado/UF', group: 'Informações Básicas' },
  zip_code: { label: 'CEP', group: 'Informações Básicas' },

  // Education
  education_level: { label: 'Escolaridade', group: 'Educação' },
  institution: { label: 'Instituição', group: 'Educação' },
  course: { label: 'Curso', group: 'Educação' },
  currently_studying: { label: 'Estudando Atualmente', group: 'Educação' },

  // Skills
  skills: { label: 'Habilidades', group: 'Habilidades' },
  languages: { label: 'Idiomas', group: 'Habilidades' },
  has_work_experience: { label: 'Tem Experiência', group: 'Habilidades' },

  // Availability
  available_for_internship: { label: 'Disponível para Estágio', group: 'Disponibilidade' },
  available_for_clt: { label: 'Disponível para CLT', group: 'Disponibilidade' },
  available_for_apprentice: { label: 'Disponível para Jovem Aprendiz', group: 'Disponibilidade' },
  preferred_work_type: { label: 'Modalidade de Trabalho', group: 'Disponibilidade' },

  // DISC Profile
  disc_dominante: { label: 'DISC - Dominante', group: 'Perfil DISC' },
  disc_influente: { label: 'DISC - Influente', group: 'Perfil DISC' },
  disc_estavel: { label: 'DISC - Estável', group: 'Perfil DISC' },
  disc_conforme: { label: 'DISC - Conforme', group: 'Perfil DISC' },

  // PDP Intrapersonal (Questions 1-6)
  pdp_q1: { label: 'PDP - Quem é você', group: 'PDP Intrapessoal' },
  pdp_q2: { label: 'PDP - Maiores qualidades', group: 'PDP Intrapessoal' },
  pdp_q3: { label: 'PDP - Maiores fraquezas', group: 'PDP Intrapessoal' },
  pdp_q4: { label: 'PDP - Seu sonho', group: 'PDP Intrapessoal' },
  pdp_q5: { label: 'PDP - Por que quer trabalhar', group: 'PDP Intrapessoal' },
  pdp_q6: { label: 'PDP - Como lida com desafios', group: 'PDP Intrapessoal' },

  // PDP Interpersonal (Questions 7-17)
  pdp_q7: { label: 'PDP - Melhor falando ou ouvindo', group: 'PDP Interpessoal' },
  pdp_q8: { label: 'PDP - Desafios no trabalho', group: 'PDP Interpessoal' },
  pdp_q9: { label: 'PDP - Liderar ou ser liderado', group: 'PDP Interpessoal' },
  pdp_q10: { label: 'PDP - Ambientes calmos ou ativos', group: 'PDP Interpessoal' },
  pdp_q11: { label: 'PDP - Trabalho autônomo ou supervisão', group: 'PDP Interpessoal' },
  pdp_q12: { label: 'PDP - Concentração em ambientes movimentados', group: 'PDP Interpessoal' },
  pdp_q13: { label: 'PDP - Ambiente de trabalho ideal', group: 'PDP Interpessoal' },
  pdp_q14: { label: 'PDP - Como as pessoas te descrevem', group: 'PDP Interpessoal' },
  pdp_q15: { label: 'PDP - Comportamento sob pressão', group: 'PDP Interpessoal' },
  pdp_q16: { label: 'PDP - Resolução de conflitos', group: 'PDP Interpessoal' },
  pdp_q17: { label: 'PDP - Estilo de tomada de decisão', group: 'PDP Interpessoal' },

  // Competencies
  pdp_competencies: { label: 'Competências PDP', group: 'Competências' },

  // Other
  profile_summary: { label: 'Resumo/Bio', group: 'Outros' },
};

// Column name mappings (Portuguese and English variants)
const COLUMN_MAPPINGS: Record<string, keyof Omit<ParsedCandidate, '_rowNumber' | '_isValid' | '_errors' | '_warnings'>> = {
  // Full name
  'nome': 'full_name',
  'nome completo': 'full_name',
  'name': 'full_name',
  'full name': 'full_name',
  'full_name': 'full_name',
  'candidato': 'full_name',
  'aluno': 'full_name',

  // CPF
  'cpf': 'cpf',
  'cpf do candidato': 'cpf',
  'documento': 'cpf',
  'tax id': 'cpf',

  // Email
  'email': 'email',
  'e-mail': 'email',
  'email do candidato': 'email',
  'candidate email': 'email',

  // Phone
  'telefone': 'phone',
  'tel': 'phone',
  'phone': 'phone',
  'celular': 'phone',
  'contato': 'phone',
  'whatsapp': 'phone',

  // Date of birth
  'data de nascimento': 'date_of_birth',
  'nascimento': 'date_of_birth',
  'data nascimento': 'date_of_birth',
  'date of birth': 'date_of_birth',
  'birth date': 'date_of_birth',
  'birthdate': 'date_of_birth',
  'idade': 'date_of_birth', // Will need conversion

  // Address
  'endereco': 'address',
  'endereço': 'address',
  'address': 'address',
  'rua': 'address',
  'logradouro': 'address',

  // City
  'cidade': 'city',
  'city': 'city',
  'municipio': 'city',
  'município': 'city',

  // State
  'estado': 'state',
  'uf': 'state',
  'state': 'state',

  // Zip code
  'cep': 'zip_code',
  'zip': 'zip_code',
  'zip code': 'zip_code',
  'zip_code': 'zip_code',
  'codigo postal': 'zip_code',
  'código postal': 'zip_code',

  // Education level
  'escolaridade': 'education_level',
  'nivel de escolaridade': 'education_level',
  'nível de escolaridade': 'education_level',
  'formacao': 'education_level',
  'formação': 'education_level',
  'education': 'education_level',
  'education level': 'education_level',
  'grau de instrucao': 'education_level',
  'grau de instrução': 'education_level',

  // Currently studying
  'estudando': 'currently_studying',
  'estudando atualmente': 'currently_studying',
  'currently studying': 'currently_studying',
  'esta estudando': 'currently_studying',
  'está estudando': 'currently_studying',

  // Institution
  'instituicao': 'institution',
  'instituição': 'institution',
  'institution': 'institution',
  'escola': 'institution',
  'faculdade': 'institution',
  'universidade': 'institution',

  // Course
  'curso': 'course',
  'course': 'course',
  'area de estudo': 'course',
  'área de estudo': 'course',

  // Skills
  'habilidades': 'skills',
  'skills': 'skills',
  'competencias': 'skills',
  'competências': 'skills',

  // Languages
  'idiomas': 'languages',
  'linguas': 'languages',
  'línguas': 'languages',
  'languages': 'languages',

  // Work experience
  'experiencia': 'has_work_experience',
  'experiência': 'has_work_experience',
  'tem experiencia': 'has_work_experience',
  'tem experiência': 'has_work_experience',
  'work experience': 'has_work_experience',

  // Profile summary
  'resumo': 'profile_summary',
  'sobre': 'profile_summary',
  'descricao': 'profile_summary',
  'descrição': 'profile_summary',
  'profile': 'profile_summary',
  'summary': 'profile_summary',
  'bio': 'profile_summary',

  // Available for internship
  'disponivel para estagio': 'available_for_internship',
  'disponível para estágio': 'available_for_internship',
  'estagio': 'available_for_internship',
  'estágio': 'available_for_internship',
  'internship': 'available_for_internship',

  // Available for CLT
  'disponivel para clt': 'available_for_clt',
  'disponível para clt': 'available_for_clt',
  'clt': 'available_for_clt',

  // Available for apprentice
  'disponivel para jovem aprendiz': 'available_for_apprentice',
  'disponível para jovem aprendiz': 'available_for_apprentice',
  'jovem aprendiz': 'available_for_apprentice',
  'menor aprendiz': 'available_for_apprentice',
  'aprendiz': 'available_for_apprentice',
  'apprentice': 'available_for_apprentice',

  // Preferred work type
  'modalidade': 'preferred_work_type',
  'tipo de trabalho': 'preferred_work_type',
  'work type': 'preferred_work_type',
  'presencial remoto': 'preferred_work_type',

  // DISC profile columns
  'dominante': 'disc_dominante',
  'disc dominante': 'disc_dominante',
  'disc_dominante': 'disc_dominante',
  'd': 'disc_dominante',

  'influente': 'disc_influente',
  'disc influente': 'disc_influente',
  'disc_influente': 'disc_influente',
  'i': 'disc_influente',

  'estavel': 'disc_estavel',
  'estável': 'disc_estavel',
  'disc estavel': 'disc_estavel',
  'disc_estavel': 'disc_estavel',
  's': 'disc_estavel',

  'conforme': 'disc_conforme',
  'disc conforme': 'disc_conforme',
  'disc_conforme': 'disc_conforme',
  'c': 'disc_conforme',

  // PDP competencies (separate from skills)
  'pdp competencias': 'pdp_competencies',
  'pdp competências': 'pdp_competencies',
  'pdp_competencies': 'pdp_competencies',
  'top 10 competencias': 'pdp_competencies',
  'top 10 competências': 'pdp_competencies',
  'principais competencias': 'pdp_competencies',
  'principais competências': 'pdp_competencies',
};

// Education level mappings
const EDUCATION_MAPPINGS: Record<string, ParsedCandidate['education_level']> = {
  'fundamental': 'fundamental',
  'ensino fundamental': 'fundamental',
  'fundamental incompleto': 'fundamental',
  'fundamental completo': 'fundamental',
  'medio': 'medio',
  'médio': 'medio',
  'ensino medio': 'medio',
  'ensino médio': 'medio',
  'medio incompleto': 'medio',
  'médio incompleto': 'medio',
  'medio completo': 'medio',
  'médio completo': 'medio',
  '2 grau': 'medio',
  '2º grau': 'medio',
  'superior': 'superior',
  'ensino superior': 'superior',
  'superior incompleto': 'superior',
  'superior completo': 'superior',
  'graduacao': 'superior',
  'graduação': 'superior',
  'faculdade': 'superior',
  'pos-graduacao': 'pos-graduacao',
  'pós-graduação': 'pos-graduacao',
  'pos graduacao': 'pos-graduacao',
  'pós graduação': 'pos-graduacao',
  'especializacao': 'pos-graduacao',
  'especialização': 'pos-graduacao',
  'mba': 'pos-graduacao',
  'mestrado': 'mestrado',
  'mestre': 'mestrado',
  'doutorado': 'doutorado',
  'doutor': 'doutorado',
  'phd': 'doutorado',
};

// Work type mappings
const WORK_TYPE_MAPPINGS: Record<string, ParsedCandidate['preferred_work_type']> = {
  'presencial': 'presencial',
  'on-site': 'presencial',
  'onsite': 'presencial',
  'remoto': 'remoto',
  'remote': 'remoto',
  'home office': 'remoto',
  'hibrido': 'hibrido',
  'híbrido': 'hibrido',
  'hybrid': 'hibrido',
};

/**
 * Parse an Excel or CSV file and return candidate data
 */
export function parseCandidateExcelFile(file: File): Promise<ParsedCandidate[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('O arquivo está vazio ou não contém dados válidos'));
          return;
        }

        // Parse and validate each row
        const candidates = jsonData.map((row, index) => parseRow(row, index + 2)); // +2 because row 1 is header

        resolve(candidates);
      } catch (error) {
        reject(new Error('Erro ao processar o arquivo. Verifique se é um arquivo Excel ou CSV válido.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a single row and map to candidate fields
 */
function parseRow(row: Record<string, unknown>, rowNumber: number): ParsedCandidate {
  const candidate: ParsedCandidate = {
    full_name: '',
    cpf: '',
    email: '',
    _rowNumber: rowNumber,
    _isValid: true,
    _errors: [],
    _warnings: [],
  };

  // Map columns to fields
  for (const [columnName, value] of Object.entries(row)) {
    const normalizedColumn = columnName.toLowerCase().trim();
    const fieldName = COLUMN_MAPPINGS[normalizedColumn];

    if (fieldName && value !== undefined && value !== null && value !== '') {
      const stringValue = String(value).trim();

      if (fieldName === 'education_level') {
        const normalizedEdu = stringValue.toLowerCase();
        candidate.education_level = EDUCATION_MAPPINGS[normalizedEdu];
      } else if (fieldName === 'preferred_work_type') {
        const normalizedType = stringValue.toLowerCase();
        candidate.preferred_work_type = WORK_TYPE_MAPPINGS[normalizedType];
      } else if (fieldName === 'skills' || fieldName === 'languages' || fieldName === 'pdp_competencies') {
        // Parse comma-separated values
        candidate[fieldName] = stringValue.split(/[,;]/).map(s => s.trim()).filter(s => s);
      } else if (fieldName === 'disc_dominante' || fieldName === 'disc_influente' ||
                 fieldName === 'disc_estavel' || fieldName === 'disc_conforme') {
        // Parse DISC values as numbers (0-100)
        const numValue = parseInt(stringValue.replace(/[^\d]/g, ''), 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          candidate[fieldName] = numValue;
        }
      } else if (fieldName === 'currently_studying' || fieldName === 'has_work_experience' ||
                 fieldName === 'available_for_internship' || fieldName === 'available_for_clt' ||
                 fieldName === 'available_for_apprentice') {
        candidate[fieldName] = parseBoolean(stringValue);
      } else if (fieldName === 'date_of_birth') {
        candidate.date_of_birth = parseDate(stringValue);
      } else if (fieldName === 'cpf') {
        candidate.cpf = stringValue.replace(/\D/g, ''); // Remove non-digits
      } else {
        (candidate as unknown as Record<string, unknown>)[fieldName] = stringValue;
      }
    }
  }

  // Validate required fields
  if (!candidate.full_name) {
    candidate._isValid = false;
    candidate._errors.push('Nome completo é obrigatório');
  }

  if (!candidate.cpf) {
    candidate._isValid = false;
    candidate._errors.push('CPF é obrigatório');
  } else {
    const cpfError = validateCPF(candidate.cpf);
    if (cpfError) {
      candidate._isValid = false;
      candidate._errors.push(cpfError);
    }
  }

  if (!candidate.email) {
    candidate._isValid = false;
    candidate._errors.push('Email é obrigatório');
  } else if (!isValidEmail(candidate.email)) {
    candidate._isValid = false;
    candidate._errors.push('Email inválido');
  }

  // Warnings for missing optional but useful fields
  if (!candidate.phone) {
    candidate._warnings.push('Telefone não informado');
  }
  if (!candidate.city) {
    candidate._warnings.push('Cidade não informada');
  }
  if (!candidate.education_level) {
    candidate._warnings.push('Escolaridade não informada');
  }

  return candidate;
}

/**
 * Parse boolean from various formats
 */
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['sim', 'yes', 's', 'y', '1', 'true', 'x'].includes(normalized);
}

/**
 * Parse date from various formats
 */
function parseDate(value: string): string | undefined {
  // Try different date formats
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD (ISO)
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      if (format === formats[2]) {
        // ISO format - already correct
        return value;
      }
      // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }

  return undefined;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate CPF format (11 digits)
 */
function validateCPF(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length === 0) {
    return 'CPF está vazio';
  }

  if (digits.length < 11) {
    return `CPF tem ${digits.length} dígitos (precisa ter 11)`;
  }

  if (digits.length > 11) {
    return `CPF tem ${digits.length} dígitos (máximo 11)`;
  }

  return null;
}

/**
 * Get validation summary
 */
export function getCandidateValidationSummary(candidates: ParsedCandidate[]): {
  total: number;
  valid: number;
  invalid: number;
  withWarnings: number;
  errors: { row: number; errors: string[] }[];
} {
  const valid = candidates.filter(c => c._isValid).length;
  const invalid = candidates.filter(c => !c._isValid).length;
  const withWarnings = candidates.filter(c => c._isValid && c._warnings.length > 0).length;
  const errors = candidates
    .filter(c => !c._isValid)
    .map(c => ({ row: c._rowNumber, errors: c._errors }));

  return {
    total: candidates.length,
    valid,
    invalid,
    withWarnings,
    errors,
  };
}

/**
 * Extract column headers from an Excel/CSV file
 */
export function extractExcelHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];

        // Extract headers from the first row
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          const value = cell?.v?.toString()?.trim() || `Coluna ${col + 1}`;
          headers.push(value);
        }

        resolve(headers);
      } catch (error) {
        reject(new Error('Erro ao ler cabeçalhos do arquivo'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract column headers AND sample data rows from an Excel/CSV file
 * Used for AI-powered column mapping suggestions
 */
export function extractExcelHeadersAndSamples(
  file: File,
  sampleCount: number = 5
): Promise<{ headers: string[]; sampleRows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];

        // Extract headers from the first row
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          const value = cell?.v?.toString()?.trim() || `Coluna ${col + 1}`;
          headers.push(value);
        }

        // Extract sample rows (skip header row)
        const sampleRows: Record<string, string>[] = [];
        const maxRow = Math.min(range.s.r + 1 + sampleCount, range.e.r + 1);

        for (let row = range.s.r + 1; row < maxRow; row++) {
          const rowData: Record<string, string> = {};
          let hasData = false;

          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            const header = headers[col - range.s.c];
            const value = cell?.v?.toString()?.trim() || '';
            rowData[header] = value;
            if (value) hasData = true;
          }

          // Only add rows that have at least some data
          if (hasData) {
            sampleRows.push(rowData);
          }
        }

        resolve({ headers, sampleRows });
      } catch (error) {
        reject(new Error('Erro ao ler arquivo Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detects which row contains the actual headers (not always row 1)
 * Many Excel files have decorative/empty rows at the top before the actual headers.
 * Returns the 0-indexed row number.
 */
function detectHeaderRow(worksheet: XLSX.WorkSheet, maxRowsToCheck: number = 10): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  let bestHeaderRow = 0;
  let bestScore = -1;

  const rowsToCheck = Math.min(maxRowsToCheck, range.e.r + 1);

  for (let row = 0; row < rowsToCheck; row++) {
    let score = 0;
    let nonEmptyCells = 0;
    let textCells = 0;
    let hasEmailPattern = false;
    let hasCpfPattern = false;
    let hasLongText = false;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      const value = cell?.v?.toString()?.trim() || '';

      if (value) {
        nonEmptyCells++;

        // Check if it looks like text (not pure number)
        if (isNaN(Number(value))) {
          textCells++;
        }

        // Check for data patterns (email, CPF) - these indicate DATA rows, not headers
        if (value.includes('@')) hasEmailPattern = true;
        if (/\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}/.test(value)) hasCpfPattern = true;
        if (value.length > 100) hasLongText = true;
      }
    }

    // Skip rows with less than 3 non-empty cells (likely empty/decorative)
    if (nonEmptyCells < 3) continue;

    // Calculate header score
    score = nonEmptyCells * 10;  // Reward rows with many cells filled
    score += textCells * 5;      // Reward text content (headers are text)

    // Penalize data patterns (headers don't have emails, CPFs, or long answers)
    if (hasEmailPattern) score -= 50;
    if (hasCpfPattern) score -= 50;
    if (hasLongText) score -= 30;

    // Prefer earlier rows if scores are close
    score -= row * 2;

    if (score > bestScore) {
      bestScore = score;
      bestHeaderRow = row;
    }
  }

  return bestHeaderRow;
}

/**
 * Extract ALL data from an Excel/CSV file (headers + all rows)
 * Uses smart header detection to handle Excel files with decorative/empty rows at top.
 * Used for AI-powered direct parsing (no manual mapping)
 */
export function extractFullExcelData(file: File): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];

        // Smart header detection: find the actual header row (not always row 0)
        const headerRowIndex = detectHeaderRow(worksheet);

        // Extract headers from the detected header row
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
          const cell = worksheet[cellAddress];
          const value = cell?.v?.toString()?.trim() || `Coluna ${col + 1}`;
          headers.push(value);
        }

        // Extract ALL rows (starting AFTER the header row)
        const rows: Record<string, string>[] = [];

        for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
          const rowData: Record<string, string> = {};
          let hasData = false;

          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            const header = headers[col - range.s.c];
            const value = cell?.v?.toString()?.trim() || '';
            rowData[header] = value;
            if (value) hasData = true;
          }

          // Only add rows that have at least some data
          if (hasData) {
            rows.push(rowData);
          }
        }

        resolve({ headers, rows, headerRowIndex });
      } catch (error) {
        reject(new Error('Erro ao ler arquivo Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Excel file using custom column mappings
 */
export function parseCandidateWithMappings(
  file: File,
  mappings: ColumnMapping
): Promise<ParsedCandidate[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('O arquivo está vazio ou não contém dados válidos'));
          return;
        }

        // Parse each row using custom mappings
        const candidates = jsonData.map((row, index) =>
          parseRowWithMappings(row, index + 2, mappings)
        );

        resolve(candidates);
      } catch (error) {
        reject(new Error('Erro ao processar o arquivo'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a single row using custom column mappings
 */
function parseRowWithMappings(
  row: Record<string, unknown>,
  rowNumber: number,
  mappings: ColumnMapping
): ParsedCandidate {
  const candidate: ParsedCandidate = {
    full_name: '',
    cpf: '',
    email: '',
    _rowNumber: rowNumber,
    _isValid: true,
    _errors: [],
    _warnings: [],
  };

  // Collect PDP answers
  const pdpIntrapersonal: Record<string, string> = {};
  const pdpInterpersonal: Record<string, string> = {};

  // Process each column based on mappings
  for (const [excelColumn, fieldName] of Object.entries(mappings)) {
    if (!fieldName) continue; // Skip unmapped columns

    const value = row[excelColumn];
    if (value === undefined || value === null || value === '') continue;

    const stringValue = String(value).trim();

    // Handle PDP questions (q1-q6 = intrapersonal, q7-q17 = interpersonal)
    if (fieldName.startsWith('pdp_q')) {
      const questionNum = fieldName.replace('pdp_q', '');
      const qNum = parseInt(questionNum, 10);
      if (qNum >= 1 && qNum <= 6) {
        pdpIntrapersonal[questionNum] = stringValue;
      } else if (qNum >= 7 && qNum <= 17) {
        pdpInterpersonal[questionNum] = stringValue;
      }
      continue;
    }

    // Handle different field types
    if (fieldName === 'education_level') {
      const normalizedEdu = stringValue.toLowerCase();
      candidate.education_level = EDUCATION_MAPPINGS[normalizedEdu];
    } else if (fieldName === 'preferred_work_type') {
      const normalizedType = stringValue.toLowerCase();
      candidate.preferred_work_type = WORK_TYPE_MAPPINGS[normalizedType];
    } else if (fieldName === 'skills' || fieldName === 'languages' || fieldName === 'pdp_competencies') {
      candidate[fieldName] = stringValue.split(/[,;]/).map(s => s.trim()).filter(s => s);
    } else if (fieldName === 'disc_dominante' || fieldName === 'disc_influente' ||
               fieldName === 'disc_estavel' || fieldName === 'disc_conforme') {
      const numValue = parseInt(stringValue.replace(/[^\d]/g, ''), 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        candidate[fieldName] = numValue;
      }
    } else if (fieldName === 'currently_studying' || fieldName === 'has_work_experience' ||
               fieldName === 'available_for_internship' || fieldName === 'available_for_clt' ||
               fieldName === 'available_for_apprentice') {
      (candidate as any)[fieldName] = parseBoolean(stringValue);
    } else if (fieldName === 'date_of_birth') {
      candidate.date_of_birth = parseDate(stringValue);
    } else if (fieldName === 'cpf') {
      candidate.cpf = stringValue.replace(/\D/g, '');
    } else {
      (candidate as any)[fieldName] = stringValue;
    }
  }

  // Store PDP data if any questions were answered
  if (Object.keys(pdpIntrapersonal).length > 0) {
    candidate.pdp_intrapersonal = pdpIntrapersonal;
  }
  if (Object.keys(pdpInterpersonal).length > 0) {
    candidate.pdp_interpersonal = pdpInterpersonal;
  }

  // Validate required fields
  if (!candidate.full_name) {
    candidate._isValid = false;
    candidate._errors.push('Nome completo é obrigatório');
  }

  if (!candidate.cpf) {
    candidate._isValid = false;
    candidate._errors.push('CPF é obrigatório');
  } else {
    const cpfError = validateCPF(candidate.cpf);
    if (cpfError) {
      candidate._isValid = false;
      candidate._errors.push(cpfError);
    }
  }

  if (!candidate.email) {
    candidate._isValid = false;
    candidate._errors.push('Email é obrigatório');
  } else if (!isValidEmail(candidate.email)) {
    candidate._isValid = false;
    candidate._errors.push('Email inválido');
  }

  // Warnings for missing optional but useful fields
  if (!candidate.phone) {
    candidate._warnings.push('Telefone não informado');
  }
  if (!candidate.city) {
    candidate._warnings.push('Cidade não informada');
  }
  if (!candidate.education_level) {
    candidate._warnings.push('Escolaridade não informada');
  }

  return candidate;
}

/**
 * Try to auto-detect mappings based on column names
 */
export function autoDetectMappings(headers: string[]): ColumnMapping {
  const mappings: ColumnMapping = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    const fieldName = COLUMN_MAPPINGS[normalized];
    if (fieldName) {
      mappings[header] = fieldName;
    }
  }

  return mappings;
}

/**
 * Check if required fields are mapped
 */
export function hasRequiredMappings(mappings: ColumnMapping): boolean {
  const mappedFields = new Set(Object.values(mappings));
  return mappedFields.has('full_name') && mappedFields.has('cpf') && mappedFields.has('email');
}

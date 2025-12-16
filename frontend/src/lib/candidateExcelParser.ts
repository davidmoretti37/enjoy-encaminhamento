/**
 * Excel/CSV Parser for Candidate Import
 *
 * Parses Excel (.xlsx, .xls) and CSV files and maps columns to candidate fields
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
  // Validation
  _rowNumber: number;
  _isValid: boolean;
  _errors: string[];
  _warnings: string[];
}

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
      } else if (fieldName === 'skills' || fieldName === 'languages') {
        // Parse comma-separated values
        candidate[fieldName] = stringValue.split(/[,;]/).map(s => s.trim()).filter(s => s);
      } else if (fieldName === 'currently_studying' || fieldName === 'has_work_experience' ||
                 fieldName === 'available_for_internship' || fieldName === 'available_for_clt' ||
                 fieldName === 'available_for_apprentice') {
        candidate[fieldName] = parseBoolean(stringValue);
      } else if (fieldName === 'date_of_birth') {
        candidate.date_of_birth = parseDate(stringValue);
      } else if (fieldName === 'cpf') {
        candidate.cpf = stringValue.replace(/\D/g, ''); // Remove non-digits
      } else {
        (candidate as Record<string, unknown>)[fieldName] = stringValue;
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

/**
 * Excel/CSV Parser for Company Import
 *
 * Parses Excel (.xlsx, .xls) and CSV files and maps columns to company fields
 */

import * as XLSX from 'xlsx';

export interface ParsedEmail {
  email: string;
  label: string;
  isPrimary: boolean;
}

export interface ParsedCompany {
  company_name: string;
  email: string; // Primary email (first valid one)
  emails: ParsedEmail[]; // All parsed emails
  cnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  industry?: string;
  company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  website?: string;
  description?: string;
  notes?: string;
  // Job fields (optional - only if job columns exist in Excel)
  job_title?: string;
  job_description?: string;
  job_salary?: string;
  job_schedule?: string;
  job_benefits?: string;
  job_contract_type?: string;
  job_work_type?: string;
  job_required_skills?: string;
  job_openings?: string;
  job_urgency?: string;
  job_gender_preference?: string;
  job_age_range?: string;
  job_education?: string;
  job_notes?: string;
  // Validation
  _rowNumber: number;
  _isValid: boolean;
  _errors: string[];
  _warnings: string[];
}

// Column name mappings (Portuguese and English variants)
const COLUMN_MAPPINGS: Record<string, keyof Omit<ParsedCompany, '_rowNumber' | '_isValid' | '_errors' | '_warnings' | 'emails'>> = {
  // Company name
  'nome': 'company_name',
  'nome da empresa': 'company_name',
  'empresa': 'company_name',
  'razao social': 'company_name',
  'razão social': 'company_name',
  'company': 'company_name',
  'company name': 'company_name',
  'company_name': 'company_name',
  'name': 'company_name',

  // Email
  'email': 'email',
  'e-mail': 'email',
  'email da empresa': 'email',
  'company email': 'email',

  // CNPJ / CPF
  'cnpj': 'cnpj',
  'cpf': 'cnpj',
  'cnpj/cpf': 'cnpj',
  'cpf/cnpj': 'cnpj',
  'cnpj da empresa': 'cnpj',
  'tax id': 'cnpj',

  // Phone
  'telefone': 'phone',
  'tel': 'phone',
  'phone': 'phone',
  'celular': 'phone',
  'contato': 'phone',

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

  // Industry
  'setor': 'industry',
  'industria': 'industry',
  'indústria': 'industry',
  'industry': 'industry',
  'ramo': 'industry',
  'segmento': 'industry',

  // Company size
  'tamanho': 'company_size',
  'porte': 'company_size',
  'size': 'company_size',
  'company size': 'company_size',
  'funcionarios': 'company_size',
  'funcionários': 'company_size',
  'employees': 'company_size',

  // Website
  'website': 'website',
  'site': 'website',
  'url': 'website',
  'pagina': 'website',
  'página': 'website',

  // Description
  'descricao': 'description',
  'descrição': 'description',
  'description': 'description',
  'sobre': 'description',
  'about': 'description',

  // Notes
  'notas': 'notes',
  'observacoes': 'notes',
  'observações': 'notes',
  'notes': 'notes',
  'obs': 'notes',

  // Job Title
  'titulo': 'job_title',
  'título': 'job_title',
  'cargo': 'job_title',
  'vaga': 'job_title',
  'job_title': 'job_title',
  'job title': 'job_title',
  'titulo da vaga': 'job_title',
  'título da vaga': 'job_title',
  'funcao': 'job_title',
  'função': 'job_title',
  'posicao': 'job_title',
  'posição': 'job_title',
  'oportunidade': 'job_title',
  'nome da vaga': 'job_title',

  // Job Description / Main Activities
  'descricao_vaga': 'job_description',
  'descrição_vaga': 'job_description',
  'descricao da vaga': 'job_description',
  'descrição da vaga': 'job_description',
  'descricao do cargo': 'job_description',
  'descrição do cargo': 'job_description',
  'job_description': 'job_description',
  'job description': 'job_description',
  'atividades': 'job_description',
  'principais atividades': 'job_description',
  'atividades principais': 'job_description',

  // Job Salary
  'salario': 'job_salary',
  'salário': 'job_salary',
  'salary': 'job_salary',
  'remuneracao': 'job_salary',
  'remuneração': 'job_salary',
  'valor': 'job_salary',
  'bolsa': 'job_salary',

  // Job Schedule
  'horario': 'job_schedule',
  'horário': 'job_schedule',
  'schedule': 'job_schedule',
  'horario_trabalho': 'job_schedule',
  'horário de trabalho': 'job_schedule',
  'jornada': 'job_schedule',

  // Job Benefits
  'beneficios': 'job_benefits',
  'benefícios': 'job_benefits',
  'benefits': 'job_benefits',

  // Contract Type
  'tipo_contrato': 'job_contract_type',
  'tipo de contrato': 'job_contract_type',
  'tipo de vinculo': 'job_contract_type',
  'tipo de vínculo': 'job_contract_type',
  'contract_type': 'job_contract_type',
  'vinculo': 'job_contract_type',
  'vínculo': 'job_contract_type',

  // Work Type
  'modalidade': 'job_work_type',
  'work_type': 'job_work_type',
  'tipo_trabalho': 'job_work_type',
  'tipo de trabalho': 'job_work_type',
  'local de trabalho': 'job_work_type',

  // Job Required Skills (Competências Requeridas)
  'competencias requeridas': 'job_required_skills',
  'competências requeridas': 'job_required_skills',
  'requisitos': 'job_required_skills',
  'habilidades': 'job_required_skills',
  'skills': 'job_required_skills',
  'required_skills': 'job_required_skills',

  // Job Openings Count (Quantidade de Vagas)
  'quantidade de vagas': 'job_openings',
  'qtd vagas': 'job_openings',
  'qtd de vagas': 'job_openings',
  'numero de vagas': 'job_openings',
  'número de vagas': 'job_openings',
  'vagas': 'job_openings',
  'openings': 'job_openings',

  // Job Urgency (Urgência da Vaga)
  'urgencia': 'job_urgency',
  'urgência': 'job_urgency',
  'urgencia da vaga': 'job_urgency',
  'urgência da vaga': 'job_urgency',

  // Job Gender Preference (Preferência pelo Sexo)
  'preferencia pelo sexo': 'job_gender_preference',
  'preferência pelo sexo': 'job_gender_preference',
  'sexo': 'job_gender_preference',
  'genero': 'job_gender_preference',
  'gênero': 'job_gender_preference',

  // Job Age Range (Faixa Etária)
  'faixa etaria': 'job_age_range',
  'faixa etária': 'job_age_range',
  'idade': 'job_age_range',

  // Job Education (Escolaridade)
  'escolaridade': 'job_education',
  'escolaridade exigida': 'job_education',
  'formacao': 'job_education',
  'formação': 'job_education',

  // Job Notes (Observações da Vaga)
  'observacoes gerais': 'job_notes',
  'observações gerais': 'job_notes',
};

// Partial match patterns for columns with long descriptive headers
// These are checked using startsWith or includes when exact match fails
const PARTIAL_COLUMN_PATTERNS: Array<{ pattern: string; field: keyof Omit<ParsedCompany, '_rowNumber' | '_isValid' | '_errors' | '_warnings' | 'emails'> }> = [
  // Job fields - partial matches for long Excel headers
  { pattern: 'título da vaga', field: 'job_title' },
  { pattern: 'titulo da vaga', field: 'job_title' },
  { pattern: 'principais atividades', field: 'job_description' },
  { pattern: 'habilidades', field: 'job_required_skills' },
  { pattern: 'tipo de contratação', field: 'job_contract_type' },
  { pattern: 'tipo de contratacao', field: 'job_contract_type' },
  { pattern: 'dias e horários', field: 'job_schedule' },
  { pattern: 'dias e horarios', field: 'job_schedule' },
  { pattern: 'quantidade de vagas', field: 'job_openings' },
  { pattern: 'descreva os benefícios', field: 'job_benefits' },
  { pattern: 'descreva os beneficios', field: 'job_benefits' },
  { pattern: 'remuneração', field: 'job_salary' },
  { pattern: 'remuneracao', field: 'job_salary' },
  { pattern: 'observações gerais', field: 'job_notes' },
  { pattern: 'observacoes gerais', field: 'job_notes' },
  { pattern: 'urgência da vaga', field: 'job_urgency' },
  { pattern: 'urgencia da vaga', field: 'job_urgency' },
  { pattern: 'preferência pelo sexo', field: 'job_gender_preference' },
  { pattern: 'preferencia pelo sexo', field: 'job_gender_preference' },
  { pattern: 'faixa etária', field: 'job_age_range' },
  { pattern: 'faixa etaria', field: 'job_age_range' },
  { pattern: 'tem uma faixa etária', field: 'job_age_range' },
  { pattern: 'tem uma faixa etaria', field: 'job_age_range' },
  { pattern: 'escolaridade exigida', field: 'job_education' },
  { pattern: 'escolariedade exigida', field: 'job_education' }, // typo variant
  // Company fields - partial matches
  { pattern: 'razão social', field: 'company_name' },
  { pattern: 'razao social', field: 'company_name' },
  { pattern: 'nome fantasia', field: 'description' }, // Use description for trade name
  { pattern: 'endereço e número', field: 'address' },
  { pattern: 'endereco e numero', field: 'address' },
  { pattern: 'enderenço e número', field: 'address' }, // typo variant
];

/**
 * Find field mapping for a column name using exact match first, then partial match
 */
function findFieldMapping(normalizedColumn: string): keyof Omit<ParsedCompany, '_rowNumber' | '_isValid' | '_errors' | '_warnings' | 'emails'> | undefined {
  // First try exact match
  if (COLUMN_MAPPINGS[normalizedColumn]) {
    return COLUMN_MAPPINGS[normalizedColumn];
  }

  // Then try partial match (startsWith)
  for (const { pattern, field } of PARTIAL_COLUMN_PATTERNS) {
    if (normalizedColumn.startsWith(pattern)) {
      return field;
    }
  }

  return undefined;
}

// Valid company sizes
const VALID_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

// Size mappings for common variations
const SIZE_MAPPINGS: Record<string, '1-10' | '11-50' | '51-200' | '201-500' | '500+'> = {
  '1-10': '1-10',
  '1 a 10': '1-10',
  '1 to 10': '1-10',
  'micro': '1-10',
  '11-50': '11-50',
  '11 a 50': '11-50',
  '11 to 50': '11-50',
  'pequena': '11-50',
  'small': '11-50',
  '51-200': '51-200',
  '51 a 200': '51-200',
  '51 to 200': '51-200',
  'media': '51-200',
  'média': '51-200',
  'medium': '51-200',
  '201-500': '201-500',
  '201 a 500': '201-500',
  '201 to 500': '201-500',
  'grande': '201-500',
  'large': '201-500',
  '500+': '500+',
  '500 ou mais': '500+',
  '500 or more': '500+',
  'muito grande': '500+',
  'enterprise': '500+',
};

/**
 * Parse an Excel or CSV file and return company data
 */
export function parseExcelFile(file: File): Promise<ParsedCompany[]> {
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
        const companies = jsonData.map((row, index) => parseRow(row, index + 2)); // +2 because row 1 is header

        resolve(companies);
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
 * Parse a single row and map to company fields
 */
function parseRow(row: Record<string, unknown>, rowNumber: number): ParsedCompany {
  const company: ParsedCompany = {
    company_name: '',
    email: '',
    emails: [],
    _rowNumber: rowNumber,
    _isValid: true,
    _errors: [],
    _warnings: [],
  };

  // Map columns to fields
  for (const [columnName, value] of Object.entries(row)) {
    const normalizedColumn = columnName.toLowerCase().trim();
    const fieldName = findFieldMapping(normalizedColumn);

    if (fieldName && value !== undefined && value !== null && value !== '') {
      const stringValue = String(value).trim();

      if (fieldName === 'company_size') {
        // Map size value
        const normalizedSize = stringValue.toLowerCase();
        company.company_size = SIZE_MAPPINGS[normalizedSize] || undefined;
      } else {
        (company as Record<string, unknown>)[fieldName] = stringValue;
      }
    }
  }

  // Validate required fields - only name is truly required as blocking error
  if (!company.company_name) {
    company._isValid = false;
    company._errors.push('Nome da empresa é obrigatório');
  }

  // Parse multiple emails from the email field using regex extraction
  if (company.email) {
    const rawEmail = company.email;
    // Extract all email-like patterns from the raw string
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawEmail.match(emailRegex) || [];

    // Build emails array from matches
    const validEmails: ParsedEmail[] = matches.map((email, idx) => ({
      email: email.toLowerCase().trim(),
      label: idx === 0 ? 'Principal' : 'Adicional',
      isPrimary: idx === 0,
    }));

    company.emails = validEmails;

    // Set primary email to first valid one
    if (validEmails.length > 0) {
      company.email = validEmails[0].email;
    } else {
      // No valid emails found
      company._isValid = false;
      company._errors.push('Email inválido');
    }
  } else {
    company._isValid = false;
    company._errors.push('Email é obrigatório');
  }

  // Validate CNPJ/CPF if provided - just a warning, don't block
  if (company.cnpj) {
    const cnpjError = validateCNPJ(company.cnpj);
    if (cnpjError) {
      company._warnings.push(cnpjError);
    }
  } else {
    company._warnings.push('CNPJ/CPF não informado');
  }

  // Validate company_size if provided - just a warning
  if (company.company_size && !VALID_SIZES.includes(company.company_size)) {
    company._warnings.push('Tamanho da empresa inválido');
  }

  // Warn about missing optional but useful fields
  if (!company.phone) {
    company._warnings.push('Telefone não informado');
  }
  if (!company.city) {
    company._warnings.push('Cidade não informada');
  }

  return company;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate CNPJ/CPF format
 * CPF = 11 digits (individuals)
 * CNPJ = 14 digits (companies)
 * Returns error message if invalid, null if valid
 */
function validateCNPJ(cnpj: string): string | null {
  // Remove non-digits
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length === 0) {
    return 'CNPJ/CPF está vazio';
  }

  // CPF has 11 digits, CNPJ has 14 digits
  if (digits.length === 11 || digits.length === 14) {
    return null; // Valid - it's either a CPF or CNPJ
  }

  if (digits.length < 11) {
    return `CPF/CNPJ tem ${digits.length} dígitos (CPF precisa ter 11, CNPJ precisa ter 14)`;
  }

  if (digits.length > 11 && digits.length < 14) {
    return `CNPJ tem ${digits.length} dígitos (precisa ter 14)`;
  }

  if (digits.length > 14) {
    return `CNPJ tem ${digits.length} dígitos (máximo 14)`;
  }

  return null; // Valid
}

/**
 * Get the document type label based on number of digits
 * CPF = 11 digits or less, CNPJ = 14 digits
 */
export function getDocumentTypeLabel(value: string): 'CPF' | 'CNPJ' {
  const digits = value?.replace(/\D/g, '') || '';
  return digits.length <= 11 ? 'CPF' : 'CNPJ';
}

/**
 * Get column headers detected in the file
 */
export function getDetectedColumns(companies: ParsedCompany[]): string[] {
  if (companies.length === 0) return [];

  const company = companies[0];
  const detected: string[] = [];

  if (company.company_name) detected.push('Nome');
  if (company.email) detected.push('Email');
  if (company.cnpj) detected.push('CNPJ');
  if (company.phone) detected.push('Telefone');
  if (company.address) detected.push('Endereço');
  if (company.city) detected.push('Cidade');
  if (company.state) detected.push('Estado');
  if (company.zip_code) detected.push('CEP');
  if (company.industry) detected.push('Setor');
  if (company.company_size) detected.push('Tamanho');
  if (company.website) detected.push('Website');
  if (company.description) detected.push('Descrição');
  if (company.notes) detected.push('Notas');

  return detected;
}

/**
 * Get validation summary
 */
export function getValidationSummary(companies: ParsedCompany[]): {
  total: number;
  valid: number;
  invalid: number;
  withWarnings: number;
  errors: { row: number; errors: string[] }[];
} {
  const valid = companies.filter(c => c._isValid).length;
  const invalid = companies.filter(c => !c._isValid).length;
  const withWarnings = companies.filter(c => c._isValid && c._warnings.length > 0).length;
  const errors = companies
    .filter(c => !c._isValid)
    .map(c => ({ row: c._rowNumber, errors: c._errors }));

  return {
    total: companies.length,
    valid,
    invalid,
    withWarnings,
    errors,
  };
}

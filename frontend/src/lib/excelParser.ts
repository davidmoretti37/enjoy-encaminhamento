/**
 * Excel/CSV Parser for Company Import
 *
 * Uses FUZZY PATTERN MATCHING to automatically detect columns
 * Handles verbose Google Form headers, typos, and variations
 */

import * as XLSX from 'xlsx';

export interface ParsedEmail {
  email: string;
  label: string;
  isPrimary: boolean;
}

export interface ParsedCompany {
  company_name: string;
  email: string;
  emails: ParsedEmail[];
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
  // Job fields
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

// ==============================================
// FUZZY PATTERN MATCHING
// ==============================================

// IMPORTANT: Order matters! First match wins.
// Patterns with substrings that could match other words must come FIRST.
// Example: "cidade" contains "idade", so 'cidade' must come BEFORE 'idade'

const FUZZY_PATTERNS: Array<{ patterns: string[]; field: string }> = [
  // ========== PATTERNS THAT COULD BE SUBSTRINGS - MUST COME FIRST ==========

  // CITY - "cidade" contains "idade", must come before job_age_range!
  { patterns: ['cidade', 'municipio', 'município'], field: 'city' },

  // SKILLS - "habilidade" contains "idade", must come before job_age_range!
  { patterns: ['habilidade', 'competencia', 'competência', 'requisito'], field: 'job_required_skills' },

  // COMPANY SIZE - "quantidade de funcionario" must come before other "quantidade" patterns
  { patterns: ['quantidade de funcionario', 'quantidade de funcionário', 'funcionario', 'funcionário', 'porte'], field: 'company_size' },

  // ========== REST OF PATTERNS ==========

  // Company name
  { patterns: ['nome fantasia', 'razao social', 'razão social'], field: 'company_name' },

  // Email
  { patterns: ['email', 'e-mail'], field: 'email' },

  // CNPJ/CPF
  { patterns: ['cnpj', 'cpf'], field: 'cnpj' },

  // Job title
  { patterns: ['titulo da vaga', 'título da vaga', 'nome da vaga'], field: 'job_title' },

  // Job description / activities
  { patterns: ['principais atividades', 'atividades', 'descri'], field: 'job_description' },

  // Job salary
  { patterns: ['salario', 'salário', 'remuneração', 'remuneracao', 'bolsa'], field: 'job_salary' },

  // Job benefits
  { patterns: ['beneficio', 'benefício', 'descreva os benef'], field: 'job_benefits' },

  // Job contract type
  { patterns: ['tipo de contrat', 'tipo de vinculo', 'tipo de vínculo'], field: 'job_contract_type' },

  // Job schedule
  { patterns: ['dias e horario', 'dias e horário', 'horario', 'horário', 'jornada'], field: 'job_schedule' },

  // Job openings count
  { patterns: ['quantidade de vaga', 'qtd vaga', 'numero de vaga', 'número de vaga'], field: 'job_openings' },

  // Job urgency
  { patterns: ['urgencia', 'urgência'], field: 'job_urgency' },

  // Job gender preference
  { patterns: ['preferencia pelo sexo', 'preferência pelo sexo', 'sexo', 'genero', 'gênero'], field: 'job_gender_preference' },

  // Job age range - 'idade' is a substring of 'cidade' and 'habilidade', so this must come AFTER those
  { patterns: ['faixa etaria', 'faixa etária', 'idade', 'preferencia'], field: 'job_age_range' },

  // Job education
  { patterns: ['escolaridade', 'escolariedade', 'formacao', 'formação'], field: 'job_education' },

  // Job notes
  { patterns: ['observa'], field: 'job_notes' },

  // Phone
  { patterns: ['telefone fixo'], field: 'phone' },
  { patterns: ['celular'], field: 'phone' },

  // Contact person
  { patterns: ['contato', 'responsavel', 'responsável', 'pessoa responsavel', 'pessoa responsável'], field: 'notes' },

  // Address
  { patterns: ['endereco', 'endereço', 'enderenço', 'logradouro'], field: 'address' },

  // Neighborhood
  { patterns: ['bairro'], field: 'address' },

  // ZIP code
  { patterns: ['cep', 'codigo postal', 'código postal'], field: 'zip_code' },

  // State
  { patterns: ['estado', 'uf'], field: 'state' },

  // Website
  { patterns: ['site', 'redes soci', 'website'], field: 'website' },
];

// Remove accents for better matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

// Find field mapping using fuzzy pattern matching
function findFuzzyFieldMapping(columnName: string): string | undefined {
  const normalized = normalizeString(columnName);

  // Skip timestamp columns
  if (normalized.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) || normalized === 'coluna 1') {
    return undefined;
  }

  for (const { patterns, field } of FUZZY_PATTERNS) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeString(pattern);
      if (normalized.includes(normalizedPattern)) {
        return field;
      }
    }
  }

  return undefined;
}

// Size mappings
const SIZE_MAPPINGS: Record<string, '1-10' | '11-50' | '51-200' | '201-500' | '500+'> = {
  '1-10': '1-10',
  '1 a 10': '1-10',
  '11-50': '11-50',
  '11 a 50': '11-50',
  '51-200': '51-200',
  '51 a 200': '51-200',
  '201-500': '201-500',
  '201 a 500': '201-500',
  '500+': '500+',
  '500 ou mais': '500+',
};

/**
 * Result of parsing an Excel file
 */
export interface ParseResult {
  companies: ParsedCompany[];
  headers: string[];  // Original Excel column names
  rawRows: Record<string, string>[];  // Raw data for preview
  mapping: Record<string, string>;  // Excel column → our field
}

/**
 * Parse an Excel or CSV file and return company data with headers
 */
export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('O arquivo está vazio ou não contém dados válidos'));
          return;
        }

        // Filter out empty rows
        const nonEmptyRows = jsonData.filter(row => {
          const values = Object.values(row);
          return values.some(v => v && String(v).trim() !== '');
        });

        // Build column mapping once
        const columnMapping: Record<string, string> = {};
        const headers = Object.keys(nonEmptyRows[0] || {});

        for (const header of headers) {
          const field = findFuzzyFieldMapping(header);
          if (field) {
            columnMapping[header] = field;
          }
        }

        console.log('[ExcelParser] Column mapping:', columnMapping);

        // Parse each row
        const companies = nonEmptyRows.map((row, index) =>
          parseRowWithFuzzyMapping(row, columnMapping, index + 2)
        );

        resolve({
          companies,
          headers,
          rawRows: nonEmptyRows,
          mapping: columnMapping,
        });
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
 * Parse a single row using fuzzy column mapping
 */
function parseRowWithFuzzyMapping(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
  rowNumber: number
): ParsedCompany {
  const company: ParsedCompany = {
    company_name: '',
    email: '',
    emails: [],
    _rowNumber: rowNumber,
    _isValid: true,
    _errors: [],
    _warnings: [],
  };

  // Temporary storage for combining fields
  const addressParts: string[] = [];
  const phoneParts: string[] = [];
  const notesParts: string[] = [];

  // Apply mappings
  for (const [columnName, value] of Object.entries(row)) {
    if (!value || String(value).trim() === '') continue;

    const field = columnMapping[columnName];
    if (!field) continue;

    const stringValue = String(value).trim();

    switch (field) {
      case 'company_name':
        // Prefer Nome Fantasia over Razão Social
        if (!company.company_name || columnName.toLowerCase().includes('fantasia')) {
          company.company_name = stringValue;
        }
        break;

      case 'email':
        company.email = stringValue;
        break;

      case 'cnpj':
        company.cnpj = stringValue.replace(/\D/g, '');
        break;

      case 'phone':
        phoneParts.push(stringValue);
        break;

      case 'address':
        addressParts.push(stringValue);
        break;

      case 'city':
        company.city = stringValue;
        break;

      case 'state':
        company.state = stringValue;
        break;

      case 'zip_code':
        company.zip_code = stringValue;
        break;

      case 'website':
        company.website = stringValue;
        break;

      case 'company_size':
        const normalized = stringValue.toLowerCase();
        // Try to extract a number
        const numMatch = stringValue.match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (num <= 10) company.company_size = '1-10';
          else if (num <= 50) company.company_size = '11-50';
          else if (num <= 200) company.company_size = '51-200';
          else if (num <= 500) company.company_size = '201-500';
          else company.company_size = '500+';
        } else {
          company.company_size = SIZE_MAPPINGS[normalized] || undefined;
        }
        break;

      case 'notes':
        notesParts.push(`${columnName}: ${stringValue}`);
        break;

      // Job fields
      case 'job_title':
        company.job_title = stringValue;
        break;
      case 'job_description':
        company.job_description = stringValue;
        break;
      case 'job_salary':
        company.job_salary = stringValue;
        break;
      case 'job_schedule':
        company.job_schedule = stringValue;
        break;
      case 'job_benefits':
        company.job_benefits = stringValue;
        break;
      case 'job_contract_type':
        company.job_contract_type = stringValue;
        break;
      case 'job_work_type':
        company.job_work_type = stringValue;
        break;
      case 'job_required_skills':
        company.job_required_skills = stringValue;
        break;
      case 'job_openings':
        company.job_openings = stringValue;
        break;
      case 'job_urgency':
        company.job_urgency = stringValue;
        break;
      case 'job_gender_preference':
        company.job_gender_preference = stringValue;
        break;
      case 'job_age_range':
        company.job_age_range = stringValue;
        break;
      case 'job_education':
        company.job_education = stringValue;
        break;
      case 'job_notes':
        company.job_notes = stringValue;
        break;
    }
  }

  // Combine parts
  if (addressParts.length > 0) {
    company.address = addressParts.join(', ');
  }
  if (phoneParts.length > 0) {
    company.phone = phoneParts[0]; // Use first phone
  }
  if (notesParts.length > 0) {
    company.notes = notesParts.join('\n');
  }

  // Validate required fields
  if (!company.company_name) {
    company._isValid = false;
    company._errors.push('Nome da empresa não encontrado');
  }

  // Parse emails
  if (company.email) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = company.email.match(emailRegex) || [];

    const validEmails: ParsedEmail[] = matches.map((email, idx) => ({
      email: email.toLowerCase().trim(),
      label: idx === 0 ? 'Principal' : 'Adicional',
      isPrimary: idx === 0,
    }));

    company.emails = validEmails;

    if (validEmails.length > 0) {
      company.email = validEmails[0].email;
    } else {
      company._isValid = false;
      company._errors.push('Email inválido');
    }
  } else {
    company._isValid = false;
    company._errors.push('Email não encontrado');
  }

  // Warnings for optional fields
  if (company.cnpj) {
    const digits = company.cnpj.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      company._warnings.push(`CNPJ/CPF tem ${digits.length} dígitos`);
    }
  } else {
    company._warnings.push('CNPJ/CPF não informado');
  }

  if (!company.phone) {
    company._warnings.push('Telefone não informado');
  }
  if (!company.city) {
    company._warnings.push('Cidade não informada');
  }

  return company;
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

/**
 * Get the document type label based on number of digits
 */
export function getDocumentTypeLabel(value: string): 'CPF' | 'CNPJ' {
  const digits = value?.replace(/\D/g, '') || '';
  return digits.length <= 11 ? 'CPF' : 'CNPJ';
}

// Fill DOCX template placeholders with data, then convert to PDF
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { convert } from "libreoffice-convert";
import { promisify } from "util";

const convertAsync = promisify(convert);

/**
 * Fill a DOCX template with data and convert to PDF.
 *
 * The DOCX should use {placeholder} tags (e.g., {company_name}, {cnpj}).
 * docxtemplater replaces them with actual values, then libreoffice-convert
 * produces a PDF suitable for Autentique signing.
 */
export async function fillDocxTemplate(
  docxBuffer: Buffer,
  data: Record<string, string>
): Promise<Buffer> {
  // 1. Fill placeholders in the DOCX
  const zip = new PizZip(docxBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const filledDocx = doc.getZip().generate({
    type: "nodebuffer",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // 2. Convert filled DOCX to PDF via LibreOffice
  console.log("[FillDocx] Converting filled DOCX to PDF via LibreOffice...");
  const pdfBuffer = await convertAsync(filledDocx, ".pdf", undefined);
  console.log(`[FillDocx] PDF generated: ${pdfBuffer.length} bytes`);

  return Buffer.from(pdfBuffer);
}

/**
 * Build a template data dictionary from company/form data.
 * Maps frontend field names to template placeholder names.
 */
export function buildTemplateData(input: {
  legalName?: string;
  businessName?: string;
  cnpj?: string;
  contactPerson?: string;
  contactCpf?: string;
  phone?: string;
  landlinePhone?: string;
  email?: string;
  website?: string;
  employeeCount?: string;
  cep?: string;
  address?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  jobTitle?: string;
  compensation?: string;
  employmentType?: string;
}): Record<string, string> {
  const data: Record<string, string> = {};

  if (input.legalName) data.company_name = input.legalName;
  if (input.businessName) data.business_name = input.businessName;
  if (input.cnpj) data.cnpj = formatCnpj(input.cnpj);
  if (input.contactPerson) data.contact_name = input.contactPerson;
  if (input.contactCpf) data.contact_cpf = formatCpf(input.contactCpf);
  if (input.phone) data.phone = input.phone;
  if (input.landlinePhone) data.landline_phone = input.landlinePhone;
  if (input.email) data.email = input.email;
  if (input.website) data.website = input.website;
  if (input.employeeCount) data.employee_count = input.employeeCount;
  if (input.cep) data.cep = formatCep(input.cep);
  if (input.address) data.address = input.address;
  if (input.complement) data.complement = input.complement;
  if (input.neighborhood) data.neighborhood = input.neighborhood;
  if (input.city) data.city = input.city;
  if (input.state) data.state = input.state;
  if (input.jobTitle) data.job_title = input.jobTitle;
  if (input.compensation) data.compensation = input.compensation;

  if (input.employmentType) {
    const typeLabels: Record<string, string> = {
      clt: "CLT",
      estagio: "Estágio",
      jovem_aprendiz: "Jovem Aprendiz",
    };
    data.employment_type = typeLabels[input.employmentType] || input.employmentType;
  }

  // Computed: full address
  const addressParts = [
    data.address,
    data.complement,
    data.neighborhood,
    data.city && data.state ? `${data.city} - ${data.state}` : data.city || data.state,
    data.cep ? `CEP ${data.cep}` : undefined,
  ].filter(Boolean);
  if (addressParts.length > 0) {
    data.full_address = addressParts.join(", ");
  }

  // Computed: today's date in pt-BR
  data.date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return data;
}

/**
 * Build template data for hiring contracts.
 * Merges company, candidate, parent, school, job, agency, and contract data.
 */
export function buildHiringTemplateData(input: {
  company?: {
    company_name?: string;
    business_name?: string;
    cnpj?: string;
    contact_name?: string;
    contact_cpf?: string;
    phone?: string;
    landline_phone?: string;
    email?: string;
    company_email?: string;
    website?: string;
    employee_count?: string;
    cep?: string;
    address?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  candidate?: {
    full_name?: string;
    cpf?: string;
    rg?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    education_level?: string;
    institution?: string;
    course?: string;
    parent_guardian_name?: string;
    parent_guardian_cpf?: string;
    parent_guardian_email?: string;
    parent_guardian_phone?: string;
    educational_institution_name?: string;
    educational_institution_email?: string;
    educational_institution_contact?: string;
  };
  job?: {
    title?: string;
    salary?: number;
    contract_type?: string;
  };
  agency?: {
    name?: string;
    city?: string;
  };
  hiring?: {
    start_date?: string;
    end_date?: string;
    duration_months?: number;
    monthly_salary?: number;
    monthly_fee?: number;
    payment_day?: number;
    hiring_type?: string;
  };
  manualFields?: Record<string, string>;
}): Record<string, string> {
  const data: Record<string, string> = {};
  const c = input.company;
  const cand = input.candidate;
  const j = input.job;
  const a = input.agency;
  const h = input.hiring;

  // Company fields (reuse same keys as buildTemplateData)
  if (c?.company_name) data.company_name = c.company_name;
  if (c?.business_name) data.business_name = c.business_name;
  if (c?.cnpj) data.cnpj = formatCnpj(c.cnpj);
  if (c?.contact_name) data.contact_name = c.contact_name;
  if (c?.contact_cpf) data.contact_cpf = formatCpf(c.contact_cpf);
  if (c?.phone) data.phone = c.phone;
  if (c?.landline_phone) data.landline_phone = c.landline_phone;
  if (c?.email || c?.company_email) data.email = c.email || c.company_email || '';
  if (c?.website) data.website = c.website;
  if (c?.employee_count) data.employee_count = c.employee_count;
  if (c?.cep) data.cep = formatCep(c.cep);
  if (c?.address) data.address = c.address;
  if (c?.complement) data.complement = c.complement;
  if (c?.neighborhood) data.neighborhood = c.neighborhood;
  if (c?.city) data.city = c.city;
  if (c?.state) data.state = c.state;

  // Company full address
  const companyAddrParts = [
    data.address, data.complement, data.neighborhood,
    data.city && data.state ? `${data.city} - ${data.state}` : data.city || data.state,
    data.cep ? `CEP ${data.cep}` : undefined,
  ].filter(Boolean);
  if (companyAddrParts.length > 0) data.full_address = companyAddrParts.join(", ");

  // Candidate fields
  if (cand?.full_name) data.candidate_name = cand.full_name;
  if (cand?.cpf) data.candidate_cpf = formatCpf(cand.cpf);
  if (cand?.rg) data.candidate_rg = cand.rg;
  if (cand?.email) data.candidate_email = cand.email;
  if (cand?.phone) data.candidate_phone = cand.phone;
  if (cand?.date_of_birth) {
    data.candidate_dob = new Date(cand.date_of_birth).toLocaleDateString("pt-BR");
  }
  if (cand?.address) data.candidate_address = cand.address;
  if (cand?.city) data.candidate_city = cand.city;
  if (cand?.state) data.candidate_state = cand.state;
  if (cand?.zip_code) data.candidate_cep = formatCep(cand.zip_code);
  if (cand?.education_level) data.candidate_education = cand.education_level;
  if (cand?.institution) data.candidate_institution = cand.institution;
  if (cand?.course) data.candidate_course = cand.course;

  // Candidate full address
  const candAddrParts = [
    data.candidate_address,
    data.candidate_city && data.candidate_state
      ? `${data.candidate_city} - ${data.candidate_state}`
      : data.candidate_city || data.candidate_state,
    data.candidate_cep ? `CEP ${data.candidate_cep}` : undefined,
  ].filter(Boolean);
  if (candAddrParts.length > 0) data.candidate_full_address = candAddrParts.join(", ");

  // Parent/guardian fields
  if (cand?.parent_guardian_name) data.parent_name = cand.parent_guardian_name;
  if (cand?.parent_guardian_cpf) data.parent_cpf = formatCpf(cand.parent_guardian_cpf);
  if (cand?.parent_guardian_email) data.parent_email = cand.parent_guardian_email;
  if (cand?.parent_guardian_phone) data.parent_phone = cand.parent_guardian_phone;

  // School/institution fields
  if (cand?.educational_institution_name) data.school_name = cand.educational_institution_name;
  if (cand?.educational_institution_email) data.school_email = cand.educational_institution_email;
  if (cand?.educational_institution_contact) data.school_contact = cand.educational_institution_contact;

  // Job fields
  if (j?.title) data.job_title = j.title;
  if (j?.salary) data.compensation = formatCurrency(j.salary);
  if (j?.contract_type) {
    const typeLabels: Record<string, string> = {
      clt: "CLT", estagio: "Estágio", "menor-aprendiz": "Jovem Aprendiz",
    };
    data.employment_type = typeLabels[j.contract_type] || j.contract_type;
  }

  // Agency fields
  if (a?.name) data.agency_name = a.name;
  if (a?.city) data.agency_city = a.city;

  // Hiring/contract fields
  if (h?.start_date) data.start_date = new Date(h.start_date).toLocaleDateString("pt-BR");
  if (h?.end_date) data.end_date = new Date(h.end_date).toLocaleDateString("pt-BR");
  if (h?.duration_months) data.duration_months = String(h.duration_months);
  if (h?.monthly_salary) data.monthly_salary = formatCurrency(h.monthly_salary);
  if (h?.monthly_fee) data.monthly_fee = formatCurrency(h.monthly_fee);
  if (h?.payment_day) data.payment_day = String(h.payment_day);
  if (h?.hiring_type) {
    const typeLabels: Record<string, string> = {
      estagio: "Estágio", clt: "CLT", "menor-aprendiz": "Jovem Aprendiz",
    };
    data.hiring_type = typeLabels[h.hiring_type] || h.hiring_type;
  }

  // Computed: today's date
  data.date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Merge manual fields (overrides auto-filled)
  if (input.manualFields) {
    for (const [key, value] of Object.entries(input.manualFields)) {
      if (value) data[key] = value;
    }
  }

  return data;
}

/**
 * Scan a DOCX buffer for all {placeholder} tags.
 * Returns an array of unique placeholder names found in the template.
 */
export function scanPlaceholders(docxBuffer: Buffer): string[] {
  const zip = new PizZip(docxBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Get the full text of the document to find placeholders
  const fullText = doc.getFullText();
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

/**
 * Human-readable labels for placeholder names (used in review UI).
 */
export const PLACEHOLDER_LABELS: Record<string, string> = {
  // Company
  company_name: "Razao Social",
  business_name: "Nome Fantasia",
  cnpj: "CNPJ",
  contact_name: "Pessoa de Contato",
  contact_cpf: "CPF do Contato",
  phone: "Telefone",
  landline_phone: "Telefone Fixo",
  email: "Email",
  website: "Website",
  employee_count: "N° de Funcionarios",
  cep: "CEP",
  address: "Endereco",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado",
  full_address: "Endereco Completo",
  // Candidate
  candidate_name: "Nome do Candidato",
  candidate_cpf: "CPF do Candidato",
  candidate_rg: "RG do Candidato",
  candidate_email: "Email do Candidato",
  candidate_phone: "Telefone do Candidato",
  candidate_dob: "Data de Nascimento",
  candidate_address: "Endereco do Candidato",
  candidate_city: "Cidade do Candidato",
  candidate_state: "Estado do Candidato",
  candidate_cep: "CEP do Candidato",
  candidate_education: "Escolaridade",
  candidate_institution: "Instituicao de Ensino",
  candidate_course: "Curso",
  candidate_full_address: "Endereco Completo do Candidato",
  // Parent
  parent_name: "Nome do Responsavel",
  parent_cpf: "CPF do Responsavel",
  parent_email: "Email do Responsavel",
  parent_phone: "Telefone do Responsavel",
  // School
  school_name: "Instituicao de Ensino",
  school_email: "Email da Instituicao",
  school_contact: "Contato da Instituicao",
  // Job
  job_title: "Titulo da Vaga",
  compensation: "Remuneracao",
  employment_type: "Tipo de Contrato",
  // Agency
  agency_name: "Nome da Agencia",
  agency_city: "Cidade da Agencia",
  // Contract
  start_date: "Data de Inicio",
  end_date: "Data de Termino",
  duration_months: "Duracao (meses)",
  monthly_salary: "Salario Mensal",
  monthly_fee: "Taxa Mensal",
  payment_day: "Dia de Vencimento",
  hiring_type: "Tipo de Contratacao",
  date: "Data Atual",
};

// ---- Formatting helpers ----

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

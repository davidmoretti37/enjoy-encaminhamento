// @ts-nocheck
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

// ---- Formatting helpers ----

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

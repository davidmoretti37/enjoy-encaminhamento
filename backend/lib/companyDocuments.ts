// Company document filing: categories, and inference for files uploaded before
// categories existed.
//
// The operator files several documents per hired person: the estágio contract
// (TCE), two or three termos, the insurance certificate, the carta de
// encaminhamento, the fee sheet, plus whatever the candidate hands in later
// (atestados). Until now they all landed in one flat `companies.contract_files`
// array with no type and no owner, and the employee-documents panel read from
// `hiring_processes` instead — which is empty for every company, because the
// operator does not create hiring processes. So uploads reported success and
// were never visible. She re-uploaded the same TCE three times.
//
// Categories are stored per file so the panel can group by person and by type.
// Nothing here requires a hiring process to exist.

export type DocCategory =
  | "contrato_estagio"
  | "termo"
  | "seguro"
  | "encaminhamento"
  | "taxa"
  | "atestado"
  | "contrato_empresa"
  | "outros";

export const DOC_CATEGORIES: Array<{ value: DocCategory; label: string; perEmployee: boolean }> = [
  { value: "contrato_estagio", label: "Contrato de estágio (TCE)", perEmployee: true },
  { value: "termo", label: "Termo", perEmployee: true },
  { value: "seguro", label: "Apólice / certificado de seguro", perEmployee: true },
  { value: "encaminhamento", label: "Carta de encaminhamento", perEmployee: true },
  { value: "atestado", label: "Atestado", perEmployee: true },
  { value: "taxa", label: "Taxa / cobrança", perEmployee: true },
  { value: "contrato_empresa", label: "Contrato com a empresa", perEmployee: false },
  { value: "outros", label: "Outros", perEmployee: true },
];

/** Categories that belong to a hired person rather than to the company itself. */
export const EMPLOYEE_CATEGORIES: DocCategory[] = DOC_CATEGORIES.filter((c) => c.perEmployee).map(
  (c) => c.value,
);

export function categoryLabel(c: string | null | undefined): string {
  return DOC_CATEGORIES.find((d) => d.value === c)?.label ?? "Outros";
}

const strip = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Best-effort category from a filename. Order matters: "Termo_Estagio_ANEC" is
 * the estágio contract, not a generic termo, so contract patterns are tested
 * before the looser termo match.
 */
export function inferCategory(fileName: string): DocCategory {
  // Underscore counts as a word character, so \btce\b never matches "TCE_CTR4382".
  // Flatten separators to spaces first.
  const n = strip(fileName).replace(/[_\-.]+/g, " ");

  // Company-level agreement, not tied to a person.
  if (/contrato\s*parceria|contrato\s*mais\s*voce|contrato\s*de\s*servico/.test(n)) {
    return "contrato_empresa";
  }
  // TCE / Termo de Estágio / Termo de Compromisso de Estágio = the contract.
  if (/\btce\b|termo[_\s-]*estagio|termo\s*de\s*compromisso\s*de\s*estagio|contrato.*estagio/.test(n)) {
    return "contrato_estagio";
  }
  if (/seguro|apolice/.test(n)) return "seguro";
  if (/encaminhamento/.test(n)) return "encaminhamento";
  if (/atestado/.test(n)) return "atestado";
  if (/\btaxa\b|cobranca|gestao\s*de\s*estagio/.test(n)) return "taxa";
  if (/termo/.test(n)) return "termo";
  return "outros";
}

/**
 * Best-effort person name from a filename. The operator's naming is inconsistent
 * ("MariaClara", "Nhicoly 4350", "( YASMIN )", "Yasmin Cristine de Souza"), so
 * this is a starting point the UI lets her correct, never a silent source of
 * truth. Returns null when nothing looks like a name.
 */
export function inferEmployee(fileName: string): string | null {
  let n = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^employee-contract-/i, "")
    .replace(/\[[^\]]*\]/g, " ")      // [assinado], [conformidade]
    .replace(/\((\s*\d+\s*)\)/g, " ") // (1) duplicate markers
    .replace(/[_]+/g, " ");

  // Drop tokens that are structural rather than nominal.
  const NOISE = new Set([
    "tce", "ctr", "termo", "termos", "estagio", "anec", "contrato", "contratos",
    "carta", "de", "do", "da", "dos", "das", "e", "seguro", "certificado", "vida",
    "aluno", "contratado", "comprometimento", "uso", "imagem", "taxa", "gestao",
    "atestado", "encaminhamento", "parceria", "assinado", "assinada", "conformidade",
    "premier", "contabilidade", "clinica", "mais", "voce", "ltda", "apolice",
  ]);

  const parts = n
    .split(/[\s\-()]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d+$/.test(p))            // 4350, 4382 = candidate refs
    .filter((p) => !/\d/.test(p))               // ctr4382 and friends are refs, not names
    .filter((p) => !NOISE.has(strip(p).replace(/s$/, "")) && !NOISE.has(strip(p)));

  if (!parts.length) return null;

  // Split camel-case runs the operator types without spaces: MariaClara.
  const expanded = parts.flatMap((p) =>
    /^[A-ZÀ-Ú][a-zà-ú]+[A-ZÀ-Ú]/.test(p) ? p.replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2").split(" ") : [p],
  );

  const name = expanded
    .slice(0, 3)
    .map((w) => (w.length <= 2 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .trim();

  return name.length >= 3 ? name : null;
}

export type CompanyFile = {
  url: string;
  key?: string;
  name?: string;
  category?: DocCategory;
  employee?: string | null;
  uploadedAt?: string;
};

/** Fill in category/employee for a file that predates categorisation. */
export function withInferredMeta(file: CompanyFile): CompanyFile {
  if (file.category) return file;
  const source = file.name || file.key || "";
  const category = inferCategory(source);
  return {
    ...file,
    category,
    employee: file.employee ?? (category === "contrato_empresa" ? null : inferEmployee(source)),
  };
}

// ANEC report item #23 — auto-generated "Carta de Encaminhamento".
// The default wording below is a sensible template; ANEC can hand over its final
// legal text and it swaps into BODY_TEMPLATE without touching the layout.
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const BRAND_DARK = rgb(10 / 255, 35 / 255, 66 / 255); // #0A2342
const GRAY = rgb(71 / 255, 85 / 255, 105 / 255);

export interface ReferralLetterData {
  companyName?: string | null;
  companyCnpj?: string | null;
  candidateName?: string | null;
  candidateCpf?: string | null;
  jobTitle?: string | null;
  hiringType?: string | null;
  startDate?: string | null;
  city?: string | null;
  state?: string | null;
}

const HIRING_TYPE_LABELS: Record<string, string> = {
  estagio: "estágio",
  clt: "CLT",
  "menor-aprendiz": "jovem aprendiz",
  menor_aprendiz: "jovem aprendiz",
  jovem_aprendiz: "jovem aprendiz",
  pj: "prestação de serviços (PJ)",
};

function formatDateBr(dateStr?: string | null): string {
  if (!dateStr) return "___/___/______";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-");
  if (!y || !m || !d) return String(dateStr);
  return `${d}/${m}/${y}`;
}

export async function buildReferralLetterPdf(data: ReferralLetterData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const wrap = (text: string, size: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const draw = (text: string, size: number, bold = false, color = GRAY, gap = 6) => {
    for (const line of wrap(text, size)) {
      page.drawText(line, { x: margin, y, size, font: bold ? fontBold : font, color });
      y -= size + gap;
    }
  };

  // Header
  page.drawText("ANEC — Inexxa Formação Profissionalizante", {
    x: margin, y, size: 14, font: fontBold, color: BRAND_DARK,
  });
  y -= 24;
  page.drawText("CARTA DE ENCAMINHAMENTO", {
    x: margin, y, size: 16, font: fontBold, color: BRAND_DARK,
  });
  y -= 34;

  const hiringLabel = data.hiringType ? (HIRING_TYPE_LABELS[data.hiringType] || data.hiringType) : "a função";
  const candidateName = data.candidateName || "________________________";
  const candidateCpf = data.candidateCpf || "___________";
  const companyName = data.companyName || "________________________";
  const companyCnpj = data.companyCnpj || "___________";
  const jobTitle = data.jobTitle || "a vaga indicada";

  // Body (swap this template for ANEC's final wording later)
  const body =
    `A ANEC / Inexxa Formação Profissionalizante encaminha o(a) candidato(a) ` +
    `${candidateName}, inscrito(a) no CPF ${candidateCpf}, para atuar como ` +
    `${jobTitle} na modalidade de ${hiringLabel}, junto à empresa ${companyName}, ` +
    `CNPJ ${companyCnpj}, com início previsto para ${formatDateBr(data.startDate)}.`;

  draw(body, 11, false, GRAY, 8);
  y -= 8;
  draw(
    "O(a) candidato(a) foi avaliado(a) e considerado(a) apto(a) para o encaminhamento. " +
    "Colocamo-nos à disposição para quaisquer esclarecimentos que se façam necessários.",
    11, false, GRAY, 8,
  );

  // Place + date
  y -= 24;
  const place = [data.city, data.state].filter(Boolean).join(" - ") || "____________";
  draw(`${place}, ${formatDateBr(data.startDate)}.`, 11, false, GRAY, 8);

  // Signature line
  y -= 48;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 240, y }, thickness: 1, color: GRAY });
  y -= 16;
  draw("ANEC — Inexxa Formação Profissionalizante", 10, true, BRAND_DARK, 4);

  return await pdf.save();
}

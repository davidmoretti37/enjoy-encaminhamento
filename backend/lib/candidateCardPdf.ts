import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { sanitizeLine, wrapText } from "./pdfText";
import { computeDiscInterpretation } from "./discProfiles";

const BRAND_DARK = rgb(10 / 255, 35 / 255, 66 / 255); // #0A2342
const BRAND_ORANGE = rgb(255 / 255, 107 / 255, 53 / 255); // #FF6B35
const BRAND_MED = rgb(27 / 255, 77 / 255, 122 / 255); // #1B4D7A
const GRAY_600 = rgb(71 / 255, 85 / 255, 105 / 255);
const GRAY_400 = rgb(148 / 255, 163 / 255, 184 / 255);
const WHITE = rgb(1, 1, 1);
const RED = rgb(239 / 255, 68 / 255, 68 / 255);
const YELLOW = rgb(234 / 255, 179 / 255, 8 / 255);
const GREEN = rgb(34 / 255, 197 / 255, 94 / 255);
const BLUE = rgb(59 / 255, 130 / 255, 246 / 255);

interface CandidateCardData {
  name: string;
  city?: string | null;
  state?: string | null;
  age?: number | null;
  education?: string | null;
  institution?: string | null;
  course?: string | null;
  currently_studying?: boolean | null;
  skills?: string[] | null;
  languages?: Array<{ language: string; level?: string }> | string[] | null;
  experience?: Array<{ company?: string; role?: string; description?: string }> | null;
  summary?: string | null;
  disc_dominante?: number | null;
  disc_influente?: number | null;
  disc_estavel?: number | null;
  disc_conforme?: number | null;
  pdp_top_10_competencies?: string[] | null;
  pdp_develop_competencies?: string[] | null;
  available_for_clt?: boolean | null;
  available_for_internship?: boolean | null;
  available_for_apprentice?: boolean | null;
  is_school_student?: boolean | null;
  interview?: {
    interview_type: string;
    scheduled_at: string;
    duration_minutes?: number;
    location_address?: string | null;
    location_city?: string | null;
    location_state?: string | null;
    meeting_link?: string | null;
  } | null;
  matchScore?: number | null;
  jobTitle?: string | null;
}

function drawBar(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fillPercent: number,
  fillColor: ReturnType<typeof rgb>,
  bgColor = rgb(0.92, 0.92, 0.92)
) {
  // Background
  page.drawRectangle({ x, y, width, height, color: bgColor });
  // Fill
  if (fillPercent > 0) {
    page.drawRectangle({
      x,
      y,
      width: width * Math.min(fillPercent / 100, 1),
      height,
      color: fillColor,
    });
  }
}

/**
 * Every string drawn on the page goes through here.
 *
 * pdf-lib's standard fonts encode with WinAnsi and THROW on anything outside
 * CP1252, so one emoji or newline in one candidate field failed the entire
 * export ("WinAnsi cannot encode ... 0x000a"). Sanitising at the single point
 * where text meets the page means no future field can reintroduce the crash.
 */
function drawText(page: PDFPage, text: unknown, options: any): void {
  const safe = sanitizeLine(text);
  if (!safe) return;
  // page.drawText, not drawText — calling the wrapper here recurses forever.
  page.drawText(safe, options);
}

const EDUCATION_LABELS: Record<string, string> = {
  fundamental: "Ensino Fundamental",
  medio: "Ensino Médio",
  tecnico: "Técnico",
  superior: "Ensino Superior",
  "pos-graduacao": "Pós-Graduação",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
};

export async function generateCandidateCardPdf(
  data: CandidateCardData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const addNewPageIfNeeded = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawSectionTitle = (title: string) => {
    addNewPageIfNeeded(30);
    y -= 8;
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: contentWidth,
      height: 1,
      color: GRAY_400,
    });
    y -= 18;
    drawText(page, title, { x: margin, y, size: 12, font: fontBold, color: BRAND_DARK });
    y -= 16;
  };

  // ─── Header ──────────────────────────────────────────────────────────
  // Brand bar
  page.drawRectangle({
    x: 0,
    y: pageHeight - 60,
    width: pageWidth,
    height: 60,
    color: BRAND_DARK,
  });

  drawText(page, "Ficha do Candidato", {
    x: margin,
    y: pageHeight - 40,
    size: 20,
    font: fontBold,
    color: WHITE,
  });

  if (data.jobTitle) {
    drawText(page, data.jobTitle, {
      x: margin,
      y: pageHeight - 54,
      size: 10,
      font,
      color: rgb(0.7, 0.8, 0.9),
    });
  }

  y = pageHeight - 60 - 20;

  // ─── Name & Info ─────────────────────────────────────────────────────
  drawText(page, data.name, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: BRAND_DARK,
  });
  y -= 18;

  const infoParts: string[] = [];
  if (data.city) infoParts.push(`${data.city}${data.state ? ` - ${data.state}` : ""}`);
  if (data.age) infoParts.push(`${data.age} anos`);
  if (data.education) infoParts.push(EDUCATION_LABELS[data.education] || data.education);

  if (infoParts.length > 0) {
    drawText(page, infoParts.join("  |  "), {
      x: margin,
      y,
      size: 9,
      font,
      color: GRAY_600,
    });
    y -= 14;
  }

  if (data.matchScore) {
    drawText(page, `Score de Compatibilidade: ${Math.round(data.matchScore)}%`, {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: BRAND_ORANGE,
    });
    y -= 14;
  }

  // ─── Interview ───────────────────────────────────────────────────────
  if (data.interview) {
    drawSectionTitle("Entrevista Agendada");
    const iv = data.interview;
    const date = new Date(iv.scheduled_at);
    const dateStr = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const typeStr = iv.interview_type === "online" ? "Online" : "Presencial";

    drawText(page, `${typeStr} — ${dateStr} às ${timeStr}`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: BRAND_MED,
    });
    y -= 14;

    if (iv.duration_minutes) {
      drawText(page, `Duração: ${iv.duration_minutes} minutos`, {
        x: margin,
        y,
        size: 9,
        font,
        color: GRAY_600,
      });
      y -= 12;
    }

    if (iv.interview_type !== "online" && iv.location_address) {
      const loc = [iv.location_address, iv.location_city, iv.location_state]
        .filter(Boolean)
        .join(", ");
      drawText(page, `Local: ${loc}`, {
        x: margin,
        y,
        size: 9,
        font,
        color: GRAY_600,
      });
      y -= 12;
    }

    if (iv.meeting_link) {
      drawText(page, `Link: ${iv.meeting_link}`, {
        x: margin,
        y,
        size: 9,
        font,
        color: BLUE,
      });
      y -= 12;
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  if (data.summary) {
    drawSectionTitle("Resumo do Candidato");
    const summaryLines = wrapText(data.summary, font, 9, contentWidth);
    for (const line of summaryLines) {
      addNewPageIfNeeded(14);
      drawText(page, line, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── DISC Profile ────────────────────────────────────────────────────
  const discValues = [
    { label: "D - Dominante", value: data.disc_dominante, color: RED },
    { label: "I - Influente", value: data.disc_influente, color: YELLOW },
    { label: "S - Estável", value: data.disc_estavel, color: GREEN },
    { label: "C - Conforme", value: data.disc_conforme, color: BLUE },
  ];

  const hasDISC = discValues.some((d) => d.value != null && d.value > 0);
  if (hasDISC) {
    drawSectionTitle("Perfil DISC");
    for (const disc of discValues) {
      addNewPageIfNeeded(18);
      drawText(page, disc.label, {
        x: margin,
        y: y + 2,
        size: 9,
        font: fontBold,
        color: GRAY_600,
      });
      const barX = margin + 100;
      const barW = contentWidth - 100 - 40;
      drawBar(page, barX, y, barW, 10, disc.value || 0, disc.color);
      drawText(page, `${disc.value || 0}%`, {
        x: barX + barW + 6,
        y: y + 1,
        size: 8,
        font,
        color: GRAY_600,
      });
      y -= 18;
    }

    // ─── Interpretive DISC analysis (report item #7) ──────────────────
    // Rule-based (computeDiscInterpretation) so it matches the on-screen card.
    const interp = computeDiscInterpretation(
      data.disc_dominante,
      data.disc_influente,
      data.disc_estavel,
      data.disc_conforme,
    );

    // Small local helpers scoped to this block.
    const drawParagraph = (text: string, size = 9, color = GRAY_600) => {
      for (const line of wrapText(text, font, size, contentWidth)) {
        addNewPageIfNeeded(size + 4);
        drawText(page, line, { x: margin, y, size, font, color });
        y -= size + 4;
      }
    };
    const drawLabeled = (label: string, value: string) => {
      for (const line of wrapText(`${label}: ${value}`, font, 9, contentWidth)) {
        addNewPageIfNeeded(13);
        drawText(page, line, { x: margin, y, size: 9, font, color: GRAY_600 });
        y -= 13;
      }
    };

    if (interp.primary) {
      y -= 6;
      addNewPageIfNeeded(16);
      drawText(page, `Perfil Predominante: ${interp.primary.title} (${interp.primary.value}%)`, {
        x: margin, y, size: 11, font: fontBold, color: BRAND_DARK,
      });
      y -= 16;
      drawParagraph(interp.primary.description);
      drawLabeled("Foco", interp.primary.focus);
      drawLabeled("Motivação", interp.primary.motivation);
      drawLabeled("Forças", interp.primary.strengths.join(", "));
      drawLabeled("Comunicação", interp.primary.communication);
      drawLabeled("Pontos de atenção", interp.primary.risks.join(", "));

      if (interp.secondary) {
        y -= 6;
        addNewPageIfNeeded(15);
        drawText(page, `Perfil Secundário: ${interp.secondary.title} (${interp.secondary.value}%)`, {
          x: margin, y, size: 10, font: fontBold, color: BRAND_MED,
        });
        y -= 15;
        drawParagraph(interp.secondary.description);
        drawLabeled("Forças", interp.secondary.strengths.join(", "));
      }

      if (interp.combined) {
        y -= 6;
        addNewPageIfNeeded(15);
        drawText(page, `Perfil Combinado: ${interp.combined.name}`, {
          x: margin, y, size: 10, font: fontBold, color: BRAND_MED,
        });
        y -= 15;
        drawParagraph(interp.combined.description);
        for (const t of interp.combined.traits) drawParagraph(`• ${t}`);
        drawLabeled("Principal risco", interp.combined.risk);
        drawLabeled("Comum em", interp.combined.commonIn);
      }
    }
  }

  // ─── PDP Competencies ────────────────────────────────────────────────
  if (data.pdp_top_10_competencies && data.pdp_top_10_competencies.length > 0) {
    drawSectionTitle("Top Competências (PDP)");
    for (let i = 0; i < data.pdp_top_10_competencies.length; i++) {
      addNewPageIfNeeded(14);
      drawText(page, `${i + 1}. ${data.pdp_top_10_competencies[i]}`, {
        x: margin,
        y,
        size: 9,
        font,
        color: GRAY_600,
      });
      y -= 13;
    }
  }

  if (data.pdp_develop_competencies && data.pdp_develop_competencies.length > 0) {
    drawSectionTitle("Áreas de Desenvolvimento");
    for (const comp of data.pdp_develop_competencies) {
      addNewPageIfNeeded(14);
      drawText(page, `• ${comp}`, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Skills ──────────────────────────────────────────────────────────
  if (data.skills && data.skills.length > 0) {
    drawSectionTitle("Habilidades");
    const skillsText = data.skills.join("  •  ");
    const skillLines = wrapText(skillsText, font, 9, contentWidth);
    for (const line of skillLines) {
      addNewPageIfNeeded(14);
      drawText(page, line, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Languages ───────────────────────────────────────────────────────
  if (data.languages && data.languages.length > 0) {
    drawSectionTitle("Idiomas");
    for (const lang of data.languages) {
      addNewPageIfNeeded(14);
      const text = typeof lang === "string" ? lang : `${lang.language}${lang.level ? ` (${lang.level})` : ""}`;
      drawText(page, `• ${text}`, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Education ───────────────────────────────────────────────────────
  if (data.institution || data.course) {
    drawSectionTitle("Formação");
    if (data.institution) {
      drawText(page, data.institution, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: BRAND_DARK,
      });
      y -= 14;
    }
    if (data.course) {
      drawText(page, data.course, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
    if (data.currently_studying) {
      drawText(page, "Cursando atualmente", { x: margin, y, size: 9, font, color: BRAND_MED });
      y -= 13;
    }
  }

  // ─── Experience ──────────────────────────────────────────────────────
  if (data.experience && data.experience.length > 0) {
    drawSectionTitle("Experiência Profissional");
    for (const exp of data.experience) {
      addNewPageIfNeeded(30);
      if (exp.role) {
        drawText(page, exp.role, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: BRAND_DARK,
        });
        y -= 14;
      }
      if (exp.company) {
        drawText(page, exp.company, { x: margin, y, size: 9, font, color: BRAND_MED });
        y -= 13;
      }
      if (exp.description) {
        const descLines = wrapText(exp.description, font, 9, contentWidth);
        for (const line of descLines.slice(0, 3)) {
          addNewPageIfNeeded(14);
          drawText(page, line, { x: margin, y, size: 9, font, color: GRAY_600 });
          y -= 13;
        }
      }
      y -= 6;
    }
  }

  // ─── Availability ────────────────────────────────────────────────────
  const availTypes: string[] = [];
  if (data.available_for_internship) availTypes.push("Estágio");
  if (data.available_for_clt) availTypes.push("CLT");
  if (data.available_for_apprentice) availTypes.push("Jovem Aprendiz");
  if (availTypes.length > 0) {
    drawSectionTitle("Disponibilidade");
    addNewPageIfNeeded(20);
    const availLine = availTypes.join("  •  ");
    drawText(page, availLine, { x: margin, y, size: 10, font, color: BRAND_MED });
    y -= 14;
    if (data.is_school_student) {
      drawText(page, "Inexxa Formação Profissionalizante", { x: margin, y, size: 9, font: fontBold, color: BRAND_ORANGE });
      y -= 13;
    }
  } else if (data.is_school_student) {
    drawSectionTitle("Informações Adicionais");
    addNewPageIfNeeded(20);
    drawText(page, "Inexxa Formação Profissionalizante", { x: margin, y, size: 9, font: fontBold, color: BRAND_ORANGE });
    y -= 13;
  }

  // ─── Footer ──────────────────────────────────────────────────────────
  const firstPage = doc.getPages()[0];
  firstPage.drawText("Gerado por ANEC - Agência Nacional de Encaminhamento e Carreira", {
    x: margin,
    y: 25,
    size: 7,
    font,
    color: GRAY_400,
  });

  return doc.save();
}

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";

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

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      currentLine = test;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
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
    page.drawText(title, { x: margin, y, size: 12, font: fontBold, color: BRAND_DARK });
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

  page.drawText("Ficha do Candidato", {
    x: margin,
    y: pageHeight - 40,
    size: 20,
    font: fontBold,
    color: WHITE,
  });

  if (data.jobTitle) {
    page.drawText(data.jobTitle, {
      x: margin,
      y: pageHeight - 54,
      size: 10,
      font,
      color: rgb(0.7, 0.8, 0.9),
    });
  }

  y = pageHeight - 60 - 20;

  // ─── Name & Info ─────────────────────────────────────────────────────
  page.drawText(data.name, {
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
    page.drawText(infoParts.join("  |  "), {
      x: margin,
      y,
      size: 9,
      font,
      color: GRAY_600,
    });
    y -= 14;
  }

  if (data.matchScore) {
    page.drawText(`Score de Compatibilidade: ${Math.round(data.matchScore)}%`, {
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

    page.drawText(`${typeStr} — ${dateStr} às ${timeStr}`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: BRAND_MED,
    });
    y -= 14;

    if (iv.duration_minutes) {
      page.drawText(`Duração: ${iv.duration_minutes} minutos`, {
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
      page.drawText(`Local: ${loc}`, {
        x: margin,
        y,
        size: 9,
        font,
        color: GRAY_600,
      });
      y -= 12;
    }

    if (iv.meeting_link) {
      page.drawText(`Link: ${iv.meeting_link}`, {
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
      page.drawText(line, { x: margin, y, size: 9, font, color: GRAY_600 });
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
      page.drawText(disc.label, {
        x: margin,
        y: y + 2,
        size: 9,
        font: fontBold,
        color: GRAY_600,
      });
      const barX = margin + 100;
      const barW = contentWidth - 100 - 40;
      drawBar(page, barX, y, barW, 10, disc.value || 0, disc.color);
      page.drawText(`${disc.value || 0}%`, {
        x: barX + barW + 6,
        y: y + 1,
        size: 8,
        font,
        color: GRAY_600,
      });
      y -= 18;
    }
  }

  // ─── PDP Competencies ────────────────────────────────────────────────
  if (data.pdp_top_10_competencies && data.pdp_top_10_competencies.length > 0) {
    drawSectionTitle("Top Competências (PDP)");
    for (let i = 0; i < data.pdp_top_10_competencies.length; i++) {
      addNewPageIfNeeded(14);
      page.drawText(`${i + 1}. ${data.pdp_top_10_competencies[i]}`, {
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
      page.drawText(`• ${comp}`, { x: margin, y, size: 9, font, color: GRAY_600 });
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
      page.drawText(line, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Languages ───────────────────────────────────────────────────────
  if (data.languages && data.languages.length > 0) {
    drawSectionTitle("Idiomas");
    for (const lang of data.languages) {
      addNewPageIfNeeded(14);
      const text = typeof lang === "string" ? lang : `${lang.language}${lang.level ? ` (${lang.level})` : ""}`;
      page.drawText(`• ${text}`, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Education ───────────────────────────────────────────────────────
  if (data.institution || data.course) {
    drawSectionTitle("Formação");
    if (data.institution) {
      page.drawText(data.institution, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: BRAND_DARK,
      });
      y -= 14;
    }
    if (data.course) {
      page.drawText(data.course, { x: margin, y, size: 9, font, color: GRAY_600 });
      y -= 13;
    }
  }

  // ─── Experience ──────────────────────────────────────────────────────
  if (data.experience && data.experience.length > 0) {
    drawSectionTitle("Experiência Profissional");
    for (const exp of data.experience) {
      addNewPageIfNeeded(30);
      if (exp.role) {
        page.drawText(exp.role, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: BRAND_DARK,
        });
        y -= 14;
      }
      if (exp.company) {
        page.drawText(exp.company, { x: margin, y, size: 9, font, color: BRAND_MED });
        y -= 13;
      }
      if (exp.description) {
        const descLines = wrapText(exp.description, font, 9, contentWidth);
        for (const line of descLines.slice(0, 3)) {
          addNewPageIfNeeded(14);
          page.drawText(line, { x: margin, y, size: 9, font, color: GRAY_600 });
          y -= 13;
        }
      }
      y -= 6;
    }
  }

  // ─── Footer ──────────────────────────────────────────────────────────
  const firstPage = doc.getPages()[0];
  firstPage.drawText("Gerado por Enjoy Encaminhamento", {
    x: margin,
    y: 25,
    size: 7,
    font,
    color: GRAY_400,
  });

  return doc.save();
}

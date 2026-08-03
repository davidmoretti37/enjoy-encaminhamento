// Text that reaches a pdf-lib standard font.
//
// The standard fonts encode with WinAnsi (CP1252) and THROW on anything else —
// from widthOfTextAtSize during wrapping, before a single glyph is drawn. So one
// bad character in one candidate field failed the whole export, which is what
// the operator hit: "WinAnsi cannot encode ' ' (0x000a)" on Baixar PDF.
import { describe, it, expect, beforeAll } from "vitest";
import { PDFDocument, StandardFonts, PDFFont } from "pdf-lib";
import { sanitizeWinAnsi, sanitizeLine, wrapText } from "../../lib/pdfText";

let font: PDFFont;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

// Verbatim from the candidate profile in the bug report.
const REAL_ANSWER =
  "As pessoas costumam me descrever como alguém comunicativo, responsável e prestativo.\n" +
  "Sou saber ouvir bem os outros, manter uma boa convivência com todos ao meu redor.";

describe("sanitizeWinAnsi", () => {
  it("keeps Portuguese accents untouched", () => {
    const s = "alguém comunicativo, responsável, convivência, ação, português";
    expect(sanitizeWinAnsi(s)).toBe(s);
  });

  it("keeps the CP1252 typography that arrives from Word and phone keyboards", () => {
    const s = "“aspas” — travessão – meia ‘simples’ reticências…";
    expect(sanitizeWinAnsi(s)).toBe(s);
  });

  it("drops emoji instead of throwing", () => {
    // 0x1f642 was the other encoder failure waiting in free text.
    expect(sanitizeWinAnsi("ótimo 🙂 trabalho")).toBe("ótimo  trabalho");
    expect(() => font.widthOfTextAtSize(sanitizeWinAnsi("ótimo 🙂"), 9)).not.toThrow();
  });

  it("keeps real newlines but removes the control characters around them", () => {
    expect(sanitizeWinAnsi("a\r\nb")).toBe("a\nb");
    expect(sanitizeWinAnsi("a\tb")).toBe("a b");
    expect(sanitizeWinAnsi("a\u000bb")).toBe("ab"); // vertical tab, unencodable
    expect(sanitizeWinAnsi("a b")).toBe("a b"); // ordinary space survives
  });

  it("handles null and undefined without throwing", () => {
    expect(sanitizeWinAnsi(null)).toBe("");
    expect(sanitizeWinAnsi(undefined)).toBe("");
  });
});

describe("sanitizeLine", () => {
  it("collapses a multi-line answer onto one line for single-line fields", () => {
    const out = sanitizeLine(REAL_ANSWER);
    expect(out).not.toContain("\n");
    expect(() => font.widthOfTextAtSize(out, 9), "must be encodable").not.toThrow();
  });
});

describe("wrapText", () => {
  it("wraps the answer that broke the export, with no unencodable output", () => {
    const lines = wrapText(REAL_ANSWER, font, 9, 300);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(() => font.widthOfTextAtSize(line, 9)).not.toThrow();
      expect(font.widthOfTextAtSize(line, 9)).toBeLessThanOrEqual(300);
    }
  });

  it("keeps the paragraph break the candidate typed", () => {
    // The old wrapper split on " " only, so the newline stayed glued inside a
    // word and went straight to the encoder.
    const lines = wrapText("Primeiro parágrafo.\n\nSegundo parágrafo.", font, 9, 400);
    expect(lines[0]).toBe("Primeiro parágrafo.");
    expect(lines).toContain("");
    expect(lines[lines.length - 1]).toBe("Segundo parágrafo.");
  });

  it("breaks a word too long for the column instead of running off the page", () => {
    const lines = wrapText("a".repeat(500), font, 9, 100);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 9)).toBeLessThanOrEqual(100);
    }
  });

  it("does not leave a trailing blank line eating page space", () => {
    const lines = wrapText("Texto.\n\n\n", font, 9, 400);
    expect(lines[lines.length - 1]).not.toBe("");
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(wrapText("", font, 9, 300)).toEqual([]);
    expect(wrapText("   \n  ", font, 9, 300)).toEqual([]);
  });

  it("survives a field that is nothing but emoji", () => {
    expect(() => wrapText("🙂🙂🙂", font, 9, 300)).not.toThrow();
    expect(wrapText("🙂🙂🙂", font, 9, 300)).toEqual([]);
  });
});

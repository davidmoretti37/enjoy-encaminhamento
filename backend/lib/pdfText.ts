// Text handling for the pdf-lib PDFs.
//
// The standard fonts (Helvetica and friends) encode with WinAnsi, which covers
// CP1252 and nothing else. Handing it anything outside that set throws — and it
// throws from widthOfTextAtSize during wrapping, before any drawing happens, so
// the whole PDF fails rather than one glyph rendering oddly.
//
// Two things reached it from real candidate profiles:
//   - a newline, from any multi-line answer:  WinAnsi cannot encode " " (0x000a)
//   - emoji, which candidates put in free text: 0x1f642 and friends
//
// The old wrapText split on " " alone, so a newline stayed glued inside a word
// and went straight to the encoder. Every "Baixar PDF" on a candidate with a
// multi-paragraph answer failed, for the agency and for companies opening a
// batch ficha.
import type { PDFFont } from "pdf-lib";

// Codepoints above U+00FF that WinAnsi does encode (the CP1252 additions).
// Worth keeping: curly quotes and dashes arrive constantly from Word and phone
// keyboards, and dropping them would visibly mangle otherwise fine text.
const WINANSI_ABOVE_LATIN1 = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Drop everything WinAnsi cannot encode, keeping newlines for the caller to
 * handle. Losing an emoji is a fair trade for a PDF that generates at all.
 */
export function sanitizeWinAnsi(input: unknown): string {
  if (input === null || input === undefined) return "";
  let out = "";
  for (const ch of String(input)) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x0a) { out += "\n"; continue; }          // keep real breaks
    if (cp === 0x0d) continue;                            // CR of a CRLF pair
    if (cp === 0x09) { out += " "; continue; }            // tab -> space
    if (cp < 0x20 || cp === 0x7f) continue;               // other control chars
    if (cp >= 0x80 && cp <= 0x9f) continue;               // unencodable C1 block
    if (cp <= 0xff) { out += ch; continue; }              // Latin-1
    if (WINANSI_ABOVE_LATIN1.has(cp)) { out += ch; continue; }
    // Anything else (emoji, CJK, symbols) is dropped rather than thrown on.
  }
  return out;
}

/** Single-line fields: collapse breaks so nothing reaches the encoder. */
export function sanitizeLine(input: unknown): string {
  return sanitizeWinAnsi(input).replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ").trim();
}

/**
 * Wrap to maxWidth, honouring the line breaks the candidate actually typed.
 *
 * Splits on newlines first so paragraphs survive, and breaks a single word that
 * is wider than the column instead of letting it run off the page (a long URL
 * or an unbroken run of characters used to overflow silently).
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const clean = sanitizeWinAnsi(text);
  if (!clean.trim()) return [];

  const lines: string[] = [];

  for (const paragraph of clean.split("\n")) {
    if (!paragraph.trim()) {
      lines.push(""); // preserve the blank line between paragraphs
      continue;
    }

    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        current = test;
        continue;
      }
      if (current) {
        lines.push(current);
        current = "";
      }
      // A word that cannot fit on a line of its own has to be split.
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, fontSize) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  // A trailing blank line just wastes vertical space on the page.
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

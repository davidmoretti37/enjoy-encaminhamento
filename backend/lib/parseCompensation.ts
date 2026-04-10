/**
 * Parse a Brazilian compensation string into a numeric value.
 *
 * Handles both BR format (dot = thousand, comma = decimal) and
 * English-style input (dot = decimal) so that "6000.0" isn't
 * accidentally turned into 60000.
 *
 * Examples:
 *   "R$ 6.000,00"  → 6000
 *   "6.000,0"      → 6000
 *   "6000,00"      → 6000
 *   "6000.00"      → 6000   (dot is decimal, not thousand sep)
 *   "6000.0"       → 6000
 *   "6.000"        → 6000   (3 digits after dot → thousand sep)
 *   "1.500.000"    → 1500000
 *   "1500"         → 1500
 */
export function parseCompensation(text: string): number | null {
  const match = text.match(/[\d.,]+/);
  if (!match) return null;

  const raw = match[0];
  const hasComma = raw.includes(",");
  const dots = raw.match(/\./g);
  const dotCount = dots ? dots.length : 0;

  // Has comma → Brazilian format: dots are thousand separators, comma is decimal
  if (hasComma) {
    return parseFloat(raw.replace(/\./g, "").replace(",", "."));
  }

  // No dots at all → plain integer
  if (dotCount === 0) {
    return parseFloat(raw);
  }

  // Multiple dots → all are thousand separators (e.g. "1.000.000")
  if (dotCount > 1) {
    return parseFloat(raw.replace(/\./g, ""));
  }

  // Single dot — check digits after it to decide
  const afterDot = raw.split(".")[1];
  if (afterDot.length === 3) {
    // Exactly 3 digits → thousand separator (e.g. "6.000" = 6000)
    return parseFloat(raw.replace(".", ""));
  }

  // 1 or 2 digits after dot → decimal separator (e.g. "6000.0" or "6000.00")
  return parseFloat(raw);
}

// @ts-nocheck
// Embed a signature image + signer info into a PDF's last page
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function embedSignatureInPdf(
  pdfUrl: string,
  signatureDataUrl: string, // base64 PNG data URL from canvas
  signerName: string,
  signerCpf: string
): Promise<Uint8Array> {
  // Fetch original PDF
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
  }
  const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

  // Load PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // Parse the signature data URL → PNG bytes
  const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  const sigBytes = new Uint8Array(Buffer.from(base64Data, "base64"));
  const sigImage = await pdfDoc.embedPng(sigBytes);

  // Scale signature to fit (max 200px wide, keep aspect ratio)
  const maxSigWidth = 200;
  const maxSigHeight = 60;
  const sigAspect = sigImage.width / sigImage.height;
  let sigW = Math.min(maxSigWidth, sigImage.width);
  let sigH = sigW / sigAspect;
  if (sigH > maxSigHeight) {
    sigH = maxSigHeight;
    sigW = sigH * sigAspect;
  }

  // Position: bottom-left area of last page, above the margin
  const marginX = 60;
  const marginY = 60;

  // Draw signature image
  lastPage.drawImage(sigImage, {
    x: marginX,
    y: marginY + 20,
    width: sigW,
    height: sigH,
  });

  // Draw a line under the signature
  lastPage.drawLine({
    start: { x: marginX, y: marginY + 18 },
    end: { x: marginX + sigW, y: marginY + 18 },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw signer info text below
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 8;
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR");
  const cpfFormatted = signerCpf.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );

  lastPage.drawText(`${signerName}`, {
    x: marginX,
    y: marginY + 8,
    size: fontSize,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  lastPage.drawText(`CPF: ${cpfFormatted}  |  ${dateStr}`, {
    x: marginX,
    y: marginY,
    size: fontSize - 1,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}

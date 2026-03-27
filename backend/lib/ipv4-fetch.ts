import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function isNetworkError(e: any): boolean {
  const code = e?.cause?.code || e?.code || "";
  const msg = e?.message || "";
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET")
  );
}

export async function ipv4Fetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await globalThis.fetch(input, init);
    } catch (e: any) {
      lastError = e;
      if (!isNetworkError(e) || attempt === MAX_RETRIES - 1) {
        throw e;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Embeddings via OpenRouter.
//
// CORRECTION TO A PREVIOUS CLAIM IN THIS FILE
// This module used to return null with a comment asserting that "OpenRouter hosts
// ZERO embedding models", citing GET /api/v1/models. That check was real but the
// conclusion was wrong: the catalogue lists 367 models and none of them declare an
// embedding modality, yet POST /api/v1/embeddings serves them anyway.
//
// Verified against the live endpoint:
//   openai/text-embedding-3-small  -> 1536 dimensions, matching the pgvector column
//   "atendimento ao publico" vs "lida com clientes"  cosine 0.522
//   "atendimento ao publico" vs "programador python" cosine 0.238
//   12 tokens cost 2.4e-07, so the whole candidate base costs a fraction of a cent
//
// The lesson: test the endpoint, not the catalogue.
//
// This is what the semantic factor was always meant to use. Postgres full-text
// ranking (migrations 130-132) only matches shared words, so "atendimento ao
// publico" and "lida com clientes" scored as unrelated. Embeddings compare meaning.
// match_candidates_hybrid already blends vector scores back in automatically the
// moment rows appear in candidates.embedding — no further change needed there.
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';

/** True when an embeddings provider is reachable. */
export function embeddingsAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

let warnedMissingKey = false;
function warnMissingKey(): null {
  if (!warnedMissingKey) {
    warnedMissingKey = true;
    console.warn('[ai/embeddings] OPENROUTER_API_KEY not set — semantic matching falls back to text ranking.');
  }
  return null;
}

async function embed(inputs: string[]): Promise<(number[] | null)[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    warnMissingKey();
    return inputs.map(() => null);
  }

  // Empty strings make the API error on the whole batch; hold their slots and
  // send only the real ones.
  const sendable: { index: number; text: string }[] = [];
  inputs.forEach((t, i) => {
    const trimmed = (t || '').trim();
    if (trimmed) sendable.push({ index: i, text: trimmed.slice(0, 8000) });
  });
  const out: (number[] | null)[] = inputs.map(() => null);
  if (sendable.length === 0) return out;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: sendable.map((s) => s.text) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[ai/embeddings] ${res.status} from OpenRouter: ${body.slice(0, 200)}`);
    return out;
  }

  const json: any = await res.json();
  const data: any[] = json?.data || [];
  if (data.length !== sendable.length) {
    console.error(`[ai/embeddings] expected ${sendable.length} vectors, got ${data.length}`);
  }

  data.forEach((row, i) => {
    const vec = row?.embedding;
    const slot = sendable[row?.index ?? i];
    if (!slot || !Array.isArray(vec)) return;
    if (vec.length !== EMBEDDING_DIMENSIONS) {
      console.error(
        `[ai/embeddings] ${EMBEDDING_MODEL} returned ${vec.length} dims, expected ${EMBEDDING_DIMENSIONS}; `
        + `the candidates.embedding column would reject it.`,
      );
      return;
    }
    out[slot.index] = vec;
  });

  return out;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const [vec] = await embed([text]);
  return vec ?? null;
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  // OpenRouter accepts arrays; chunk so one oversized request cannot fail the lot.
  const CHUNK = 64;
  const results: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i += CHUNK) {
    results.push(...(await embed(texts.slice(i, i + CHUNK))));
  }
  return results;
}

export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };

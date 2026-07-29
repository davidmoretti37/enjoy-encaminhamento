// Embeddings — CURRENTLY UNAVAILABLE, BY DESIGN.
//
// This module used to POST to https://openrouter.ai/api/v1/embeddings with the
// model 'openai/text-embedding-3-small'. Both are wrong:
//   * OpenRouter hosts ZERO embedding models. Verified against
//     https://openrouter.ai/api/v1/models — there is no model whose output
//     modality is `embedding`, and 'openai/text-embedding-3-small' is not in the
//     catalogue.
//   * So every call failed, which is why production has 0 embeddings on 274
//     candidates and 0 on 40 jobs, and why vector matching never returned a
//     single row since launch.
//
// Rather than keep retrying an endpoint that cannot work, these functions now
// return null immediately and say why. Nothing is lost: candidate matching was
// moved to Postgres full-text ranking (migrations 130-132), which uses the data
// ANEC actually has — 269/274 candidates have skills, 274 have education,
// 270 have a city — costs nothing per query, and needs no vendor at all.
//
// TO RE-ENABLE: embeddings need a provider that offers them (Voyage, Cohere,
// OpenAI direct, or a local model). Point EMBEDDING_PROVIDER_URL at it and
// restore the fetch. `match_candidates_hybrid` already blends vector scores
// back in automatically the moment rows appear in candidates.embedding — no
// further change required.
const EMBEDDING_MODEL = 'unavailable';
const EMBEDDING_DIMENSIONS = 1536;

/** True when a real embeddings provider is configured. Currently never. */
export function embeddingsAvailable(): boolean {
  return false;
}

let warnedOnce = false;
function warnUnavailable(context: string): null {
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn(
      `[ai/embeddings] Embeddings are not available (${context}). OpenRouter hosts no `
      + `embedding models. Matching uses Postgres full-text ranking instead — see `
      + `migrations 130-132. This is expected, not an error.`,
    );
  }
  return null;
}

export async function generateEmbedding(_text: string): Promise<number[] | null> {
  return warnUnavailable('generateEmbedding');
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  warnUnavailable('generateEmbeddings');
  return texts.map(() => null);
}

export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };

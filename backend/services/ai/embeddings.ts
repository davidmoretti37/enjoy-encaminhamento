// OpenRouter Embeddings Client
// Using OpenAI text-embedding-3-small via OpenRouter

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

interface EmbeddingResponse {
  object: string;
  data: {
    object: string;
    index: number;
    embedding: number[];
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not configured, skipping embedding generation');
    return null;
  }

  if (!text || text.trim().length === 0) {
    console.warn('Empty text provided for embedding');
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5001',
        'X-Title': 'Recruitment Platform',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter Embeddings API error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.data[0]?.embedding || null;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not configured, skipping batch embedding generation');
    return texts.map(() => null);
  }

  const validTexts: { text: string; originalIndex: number }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim().length > 0) {
      validTexts.push({ text: text.slice(0, 8000), originalIndex: index });
    }
  });

  if (validTexts.length === 0) {
    return texts.map(() => null);
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5001',
        'X-Title': 'Recruitment Platform',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: validTexts.map(v => v.text),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter Embeddings API error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: EmbeddingResponse = await response.json();

    const results: (number[] | null)[] = texts.map(() => null);
    data.data.forEach((item, i) => {
      const originalIndex = validTexts[i].originalIndex;
      results[originalIndex] = item.embedding;
    });

    return results;
  } catch (error) {
    console.error('Failed to generate batch embeddings:', error);
    return texts.map(() => null);
  }
}

export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };

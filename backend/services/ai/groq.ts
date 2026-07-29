// Groq via OpenRouter API Client for fast LLM inference
// Using Llama 3.1 70B through OpenRouter

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Fallback aligned with ENV.llmModel. Both are verified-real OpenRouter ids.
const GROQ_MODEL = process.env.RERANKING_MODEL || process.env.LLM_MODEL || 'anthropic/claude-haiku-4.5';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function generateWithGroq(
  messages: Message[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not configured, skipping AI summary generation');
    return '';
  }

  const { temperature = 0.7, maxTokens = 1024 } = options;

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
          model: GROQ_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (response.status === 429) {
        const delay = 2000 * (attempt + 1);
        console.warn(`[OpenRouter] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenRouter API error:', error);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        // Returning '' here is why this failed silently for five months: every
        // caller does `if (summary)` and treats empty as "nothing to add", so a
        // dead key, an invalid model id and a network error all looked identical
        // to success-with-no-content. Log loudly enough to be findable.
        console.error(
          `[ai/groq] LLM call FAILED after ${MAX_RETRIES} attempts (model=${GROQ_MODEL}). `
          + `Callers will see an empty result and silently skip. Cause:`, error,
        );
        return '';
      }
    }
  }
  return '';
}

export { GROQ_MODEL };

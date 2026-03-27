// Groq via OpenRouter API Client for fast LLM inference
// Using Llama 3.1 70B through OpenRouter

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_MODEL = process.env.RERANKING_MODEL || process.env.LLM_MODEL || 'meta-llama/llama-3.1-70b-instruct';

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

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Failed to generate with OpenRouter:', error);
    return '';
  }
}

export { GROQ_MODEL };

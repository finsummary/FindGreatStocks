/**
 * Groq API client for SEO AI summaries.
 * Model and API URL are configurable via env (GROQ_MODEL, GROQ_API_URL).
 */

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqCompletionOptions = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  const model = options.model || GROQ_MODEL;
  const res = await fetch(`${GROQ_API_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.max_tokens ?? 512,
      temperature: options.temperature ?? 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

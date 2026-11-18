// Minimal Gemini REST client (uses Node's built-in fetch, so no extra SDK dependency).
// The API key is only ever read from environment variables and sent server-side.
const env = require('../config/env');

const isConfigured = () => Boolean(env.gemini.apiKey);

/**
 * @param {string} systemPrompt
 * @param {{role: 'user'|'bot', content: string}[]} messages chronological conversation
 * @returns {Promise<string>} raw model text
 */
async function generate(systemPrompt, messages) {
  if (!isConfigured()) throw new Error('GEMINI_API_KEY is not set');

  // Gemini expects the conversation to start with a user turn.
  const convo = [...messages];
  while (convo.length && convo[0].role !== 'user') convo.shift();
  if (!convo.length) throw new Error('No user message to send');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.gemini.model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: convo.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 800, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error(`Gemini returned no text (finishReason=${data?.candidates?.[0]?.finishReason || 'unknown'})`);
  return text;
}

module.exports = { generate, isConfigured };

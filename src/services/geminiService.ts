import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Garden, ChatMessage } from '../types';
import { buildGeminiContext } from './geminiContext';

const NativeAI = registerPlugin<{ generate(options: { prompt: string }): Promise<{ text: string; model: string }> }>('CDGuardAI');
// Keep the key in a local .env file only; never commit it to a public repository.
const GEMINI_API_KEY = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = 'gemini-3.8-flash';

async function askGeminiDirect(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_KEY_MISSING');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 700 }
      })
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
    if (!text) throw new Error('EMPTY_RESPONSE');
    return text;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function askGemini(message: string, history: ChatMessage[], garden: Garden): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const prompt = buildGeminiContext(message, history, garden);
  try {
    return `**Gemini · ${GEMINI_MODEL}:**\n\n${await askGeminiDirect(prompt)}`;
  } catch (directError) {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('CDGuardAI')) throw directError;
    const result = await NativeAI.generate({ prompt });
    if (!result.text?.trim()) throw new Error('EMPTY_RESPONSE');
    return `**Gemini · ${result.model}:**\n\n${result.text.trim()}`;
  }
}

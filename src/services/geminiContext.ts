import type { ChatMessage, Garden } from '../types';
import { calculateCRS } from '../utils/crsCalculator';

/** Only necessary, bounded context; no account identity, location or API credentials. */
export function buildGeminiContext(message: string, history: ChatMessage[], garden: Garden): string {
  const values = [garden.ph, garden.ec, garden.moisture, garden.temperature];
  const valid = values.every(Number.isFinite) && garden.ph >= 0 && garden.ph <= 14 &&
    garden.ec >= 0 && garden.ec <= 10 && garden.moisture >= 0 && garden.moisture <= 100 &&
    garden.temperature >= -50 && garden.temperature <= 100;
  const verified = !!garden.hasVerifiedReading && valid &&
    Number.isFinite(garden.lastUpdated) && garden.lastUpdated > 0;
  // The UI includes the current user message in history; do not send it twice.
  const previous = history.at(-1)?.sender === 'user' && history.at(-1)?.text === message
    ? history.slice(0, -1) : history;
  return JSON.stringify({
    garden: {
      crop: garden.crop.slice(0, 100), soilType: garden.soilType.slice(0, 100), age: garden.age,
      verified,
      ...(verified ? {
        measuredAt: new Date(garden.lastUpdated).toISOString(),
        values: { ph: garden.ph, ec_dS_m: garden.ec, moisture_percent: garden.moisture, temp_C: garden.temperature },
        experimentalRuleScore: calculateCRS(...values as [number, number, number, number]),
      } : {}),
    },
    history: previous.slice(-6).map(item => ({ role: item.sender, text: item.text.slice(0, 1400) })),
    question: message.slice(0, 2000),
  });
}

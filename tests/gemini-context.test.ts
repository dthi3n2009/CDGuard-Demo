import assert from 'node:assert/strict';
import { buildGeminiContext } from '../src/services/geminiContext';
import { DEFAULT_GARDEN } from '../src/services/demoDataService';
import type { ChatMessage } from '../src/types';

const garden = { ...DEFAULT_GARDEN, hasVerifiedReading: true, lastUpdated: Date.now(), ph: 6, ec: 0.85, moisture: 45, temperature: 28 };
const parsed = JSON.parse(buildGeminiContext('Kiểm tra đất', [], garden));
assert.equal(parsed.garden.verified, true);
assert.equal(parsed.garden.values.ec_dS_m, 0.85);
assert.ok(!('address' in parsed.garden));
assert.ok(!('name' in parsed.garden));
for (const bad of [{ hasVerifiedReading: false }, { ph: NaN }, { moisture: 150 }, { lastUpdated: 0 }]) {
  const result = JSON.parse(buildGeminiContext('Đất thế nào?', [], { ...garden, ...bad }));
  assert.equal(result.garden.verified, false);
  assert.ok(!('values' in result.garden));
}
const history: ChatMessage[] = Array.from({ length: 20 }, (_, i) => ({ id: String(i), sender: 'user', text: 'x'.repeat(5000), timestamp: 1 }));
history.push({ id: 'last', sender: 'user', text: 'Hỏi mới', timestamp: 2 });
const bounded = JSON.parse(buildGeminiContext('Hỏi mới', history, garden));
assert.equal(bounded.history.length, 6);
assert.equal(bounded.history[0].text.length, 1400);
assert.ok(!bounded.history.some((item: any) => item.text === 'Hỏi mới'));
assert.ok(buildGeminiContext('x'.repeat(9000), history, garden).length < 20000);
console.log('PASS: Gemini context bounds, unit preservation, invalid data, privacy and duplicate question.');

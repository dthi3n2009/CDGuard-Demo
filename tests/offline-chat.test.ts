import assert from 'node:assert/strict';
import { BASIC_FAQ_PAIRS } from '../src/data/basicFaq';
import { sendChatMessage } from '../src/services/aiService';
import { DEFAULT_GARDEN } from '../src/services/demoDataService';

globalThis.fetch = async () => { throw new Error('Offline chat must not use the network'); };
assert.equal(BASIC_FAQ_PAIRS.length, 100);
for (const pair of BASIC_FAQ_PAIRS) {
  const answer = await sendChatMessage(pair.question, [], DEFAULT_GARDEN);
  assert.ok(answer.includes(pair.answer), pair.question);
}
const verified = { ...DEFAULT_GARDEN, hasVerifiedReading: true };
assert.ok((await sendChatMessage('Tình trạng vườn hôm nay thế nào?', [], verified)).includes('quy tắc có sẵn'));
assert.ok((await sendChatMessage('Tình trạng vườn hôm nay thế nào?', [], { ...verified, hasVerifiedReading: false })).includes('Chưa có số đo'));
console.log('PASS: 100 FAQ questions and verified/unverified garden replies work without API/network.');

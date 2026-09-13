import assert from 'node:assert/strict';
import { fetchRealtimeReading, parseRealtimeReading } from '../src/services/realtimeReading';

const record = { device_id: 'esp32-01', ts: 1788760802544, values: { ph: 3, ec: 216, moisture: 12.3, temp: 26.4 } };
const latest = parseRealtimeReading({ '-Z': record, '-A': { ...record, values: { ...record.values, ph: 7 } } });
assert.equal(latest.key, '-Z');
assert.equal(latest.ph, 3);
assert.equal(latest.ec, 216);
assert.equal(latest.moisture, 12.3);
assert.equal(latest.temp, 26.4);
assert.equal(latest.ts, record.ts);
assert.equal(parseRealtimeReading({ key: { ...record, values: { ph: 0, ec: 0, moisture: 0, temp: -2.5 } } }).temp, -2.5);
for (const invalid of [null, {}, [], { key: { ...record, device_id: 'other' } },
  { key: { ...record, values: { ...record.values, temp: 172.9 } } },
  { key: { ...record, values: { ...record.values, moisture: 177.9 } } },
  { key: { ...record, values: { ...record.values, ph: '3' } } }]) {
  assert.throws(() => parseRealtimeReading(invalid));
}
let calls = 0;
globalThis.fetch = async (url, options) => {
  calls++;
  assert.ok(String(url).includes('/data.json?orderBy=%22%24key%22&limitToLast=20'));
  assert.equal(options?.cache, 'no-store');
  return new Response(JSON.stringify({ key: record }));
};
assert.equal((await fetchRealtimeReading()).ec, 216);
assert.equal(calls, 1);
globalThis.fetch = async () => new Response('Permission denied', { status: 401 });
await assert.rejects(fetchRealtimeReading(), /Chưa lấy được số đo/);
globalThis.fetch = async () => new Response('invalid JSON');
await assert.rejects(fetchRealtimeReading());
console.log('PASS: latest push key, exact four values without tree metadata, zero/negative values, invalid readings, HTTP/JSON failures.');

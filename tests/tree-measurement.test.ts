import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordForSelectedTree, storeTreeRecord, syncTreeRecord, measurementPath } from '../src/services/treeMeasurementService';
import { roomStorageService } from '../src/services/roomStorageService';
import type { Garden } from '../src/types';

test('selected-tree storage validates ownership, timestamps, retries, and cloud acknowledgement', async () => {
  const storage = new Map<string, string>();
  Object.assign(globalThis, { localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) }, window: new EventTarget() });
  const garden = { id: 'garden-a', deviceId: 'esp32-01' } as Garden;
  const tree = { id: 'tree-1', gardenId: garden.id, name: 'Cây 1', spotNumber: 1, variety: 'Ri6', treeAge: 1, height: 1, canopyWidth: 1 };
  roomStorageService.addOrUpdateTreeLocation(tree);
  const now = Date.now();
  const reading = { success: true, online: true, data: { deviceId: 'esp32-01', ph: 6.2, ec: 0, moisture: 65, temp: 28, ts: now - 1000 } };
  const record = recordForSelectedTree(garden, tree, reading, now - 2000, now);
  assert.equal(record.timestamp, now - 1000);
  assert.equal(record.savedAt, now);
  assert.equal(record.ec, 0);
  assert.equal(record.syncedToCloud, false);
  assert.throws(() => recordForSelectedTree(garden, tree, reading, now, now));
  assert.throws(() => recordForSelectedTree(garden, tree, { ...reading, data: { ...reading.data, treeName: 'Cây 2' } }, now - 2000, now));
  assert.throws(() => recordForSelectedTree(garden, tree, { ...reading, data: { ...reading.data, deviceId: 'other' } }, now - 2000, now));
  storeTreeRecord(record);
  storeTreeRecord(record);
  assert.equal(roomStorageService.getMeasurements(garden.id, tree.id).length, 1);
  assert.equal(roomStorageService.getTreeLocations(garden.id)[0].lastMeasuredAt, reading.data.ts);
  roomStorageService.addOrUpdateTreeLocation({ ...tree, id: 'tree-2' });
  assert.throws(() => storeTreeRecord({ ...record, spotId: 'tree-2' }));
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('Permission denied', { status: 403 });
    assert.equal(await syncTreeRecord(record, async () => 'test-guest'), false);
    assert.equal(roomStorageService.getMeasurements()[0].syncedToCloud, false);
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).endsWith(measurementPath(record)));
      assert.ok(String(url).includes('/users/test-guest/'));
      assert.equal(init?.method, 'PUT');
      assert.equal(JSON.parse(init?.body as string).spotId, tree.id);
      return new Response('{}', { status: 200 });
    };
    assert.equal(await syncTreeRecord(record, async () => 'test-guest'), true);
    assert.equal(roomStorageService.getMeasurements()[0].syncedToCloud, true);
    assert.equal(roomStorageService.getMeasurements()[0].timestamp, reading.data.ts);
  } finally { globalThis.fetch = originalFetch; }
});

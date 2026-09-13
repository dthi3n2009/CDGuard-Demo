import assert from 'node:assert/strict';
import { saveIncomingReadingForSession } from '../src/services/autoTreeMeasurement';
import { roomStorageService } from '../src/services/roomStorageService';
import type { Garden } from '../src/types';

const values = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) }, window: new EventTarget() });
const garden = { id: 'garden', deviceId: 'esp32-01' } as Garden;
const tree = { id: 'tree', gardenId: garden.id, name: 'Cây 01', spotNumber: 1, variety: 'Ri6', treeAge: 4, height: 3, canopyWidth: 2 };
roomStorageService.addOrUpdateTreeLocation(tree);
const startedAt = Date.now();
const reading = { success: true, online: true, data: { deviceId: 'esp32-01', ts: startedAt + 1, ph: 6.2, ec: 0.85, moisture: 50, temp: 28 } };
const saved = await saveIncomingReadingForSession(garden, tree, { gardenId: garden.id, treeId: tree.id, startedAt }, reading, startedAt + 2, async () => true);
assert.equal(saved.synced, true);
assert.equal(roomStorageService.getMeasurements(garden.id, tree.id).length, 1);
assert.equal(roomStorageService.getMeasurements(garden.id, tree.id)[0].spotId, tree.id);
await assert.rejects(saveIncomingReadingForSession(garden, tree, { gardenId: garden.id, treeId: 'other', startedAt }, reading, startedAt + 2, async () => true), /không còn thuộc/);
await assert.rejects(saveIncomingReadingForSession(garden, tree, { gardenId: garden.id, treeId: tree.id, startedAt: startedAt + 2 }, reading, startedAt + 3, async () => true), /Chưa có số đo mới/);
console.log('PASS: a post-selection reading is stored once in its tree path; wrong-tree and old readings are rejected.');

import assert from 'node:assert/strict';
import { roomStorageService, type TreeLocation } from '../src/services/roomStorageService';
import { localStorageService } from '../src/services/localStorageService';

const storage: Record<string, any> = {};
Object.defineProperties(storage, {
  getItem: { value: (key: string) => storage[key] ?? null },
  setItem: { value: (key: string, value: string) => { storage[key] = String(value); } },
  removeItem: { value: (key: string) => { delete storage[key]; } },
});
Object.assign(globalThis, { localStorage: storage, window: new EventTarget() });
assert.deepEqual(localStorageService.getGardens(), []);
assert.equal(localStorageService.getSettings().onboardingCompleted, false);
assert.equal(localStorageService.getUserProfile(), null);
assert.deepEqual(roomStorageService.getTreeLocations('iot'), []);
assert.equal(storage.getItem('room_tree_locations'), null, 'Reading must not write sample trees');

const tree = (id: string, gardenId: string, spotNumber: number): TreeLocation => ({
  id, gardenId, spotNumber, name: `Cây #${spotNumber}`, variety: 'Ri6', treeAge: 0, height: 0, canopyWidth: 0,
});
let overview: TreeLocation[] = [];
const unsubscribe = roomStorageService.subscribeTreeLocations(() => {
  overview = roomStorageService.getTreeLocations('iot');
});
roomStorageService.addOrUpdateTreeLocation(tree('one', 'iot', 1));
roomStorageService.addOrUpdateTreeLocation(tree('two', 'iot', 2));
roomStorageService.addOrUpdateTreeLocation(tree('three', 'iot', 3));
roomStorageService.addOrUpdateTreeLocation(tree('other', 'another-garden', 1));
assert.equal(overview.length, 3, 'Overview subscriber sees additions');
roomStorageService.deleteTreeLocation('two');
assert.deepEqual(overview.map(t => t.id), ['one', 'three']);
assert.equal(roomStorageService.getNextTreeNumber('iot'), 4, 'Deleting middle tree must not duplicate spot 3');
roomStorageService.deleteTreeLocation('one');
roomStorageService.deleteTreeLocation('three');
assert.deepEqual(overview, [], 'Deleting last tree leaves overview empty');
assert.deepEqual(roomStorageService.getTreeLocations('iot'), [], 'Reload must not restore deleted trees');
assert.equal(roomStorageService.getTreeLocations('another-garden').length, 1);
roomStorageService.deleteTreeLocation('other');
assert.deepEqual(roomStorageService.getTreeLocations(), []);
assert.equal(roomStorageService.getNextTreeNumber('iot'), 1);
unsubscribe();
roomStorageService.addOrUpdateTreeLocation(tree('new', 'iot', 1));
assert.deepEqual(overview, [], 'Unmount removes subscription');
assert.equal(roomStorageService.getTreeLocations('iot')[0].id, 'new');

storage.setItem('unrelated-app', 'preserve');
storage.setItem('cdguard_user_profile', JSON.stringify({ name: 'Existing user' }));
const previousTrees = storage.getItem('room_tree_locations');
localStorageService.resetForNewUser();
assert.equal(storage.getItem('unrelated-app'), 'preserve');
assert.equal(localStorageService.getUserProfile(), null);
assert.deepEqual(roomStorageService.getTreeLocations(), []);
assert.equal(localStorageService.getSettings().onboardingCompleted, false);
const backupKey = Object.keys(storage).find(k => k.startsWith('cdguard-backup-'))!;
assert.equal(JSON.parse(storage.getItem(backupKey)).room_tree_locations, previousTrees);
console.log('PASS: first run, add/delete, live subscription, last-tree deletion, reload, numbering, garden isolation, reset backup.');

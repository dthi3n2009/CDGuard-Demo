import { Garden } from '../types';
import { FirebaseReadingResult } from './firebaseService';
import { DetailedMeasurement, TreeLocation } from './roomStorageService';
import { recordForSelectedTree, storeTreeRecord, syncTreeRecord } from './treeMeasurementService';

/**
 * A measurement session is deliberately bound to one tree and one point in time.
 * The first valid reading created after it starts is the only record that can be saved.
 */
export interface TreeMeasurementSession {
  gardenId: string;
  treeId: string;
  startedAt: number;
}

export async function saveIncomingReadingForSession(
  garden: Garden,
  tree: TreeLocation,
  session: TreeMeasurementSession,
  reading: FirebaseReadingResult,
  now = Date.now(),
  sync: (record: DetailedMeasurement) => Promise<boolean> = syncTreeRecord,
) {
  if (session.gardenId !== garden.id || session.treeId !== tree.id) {
    throw new Error('Phiên đo không còn thuộc cây đang chọn.');
  }
  const record = storeTreeRecord(recordForSelectedTree(garden, tree, reading, session.startedAt, now));
  const synced = await sync(record);
  return { record, synced };
}

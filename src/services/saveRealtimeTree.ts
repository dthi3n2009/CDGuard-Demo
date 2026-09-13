import { Garden } from '../types';
import { RealtimeReading, fetchRealtimeReading } from './realtimeReading';
import { roomStorageService, TreeLocation } from './roomStorageService';
import { recordForSelectedTree, storeTreeRecord, syncTreeRecord } from './treeMeasurementService';
import { isReadingFresh } from './deviceStatus';

// Commit locally first so displaying the measured values never waits for cloud backup.
export function applyRealtimeToTree(garden: Garden, tree: TreeLocation, reading: RealtimeReading, now = Date.now()) {
  if (!isReadingFresh(reading.ts, now)) throw new Error('Chưa có số đo mới. Hãy đo cây này rồi lấy lại.');
  const current = roomStorageService.getTreeLocations(garden.id).find(t => t.id === tree.id);
  if (!current) throw new Error('Cây này không còn trong vườn. Hãy chọn lại cây.');
  if (current.lastMeasuredAt && reading.ts <= current.lastMeasuredAt) throw new Error('Cây đã có số đo này. Hãy thực hiện lần đo mới.');
  const record = recordForSelectedTree(garden, current, {
    success: true, online: true,
    data: { deviceId: reading.deviceId, ts: reading.ts, ph: reading.ph, ec: reading.ec / 1000,
      moisture: reading.moisture, temp: reading.temp },
  }, 0, now);
  return storeTreeRecord(record);
}

export async function receiveRealtimeForTree(garden: Garden, tree: TreeLocation) {
  const reading = await fetchRealtimeReading();
  const record = applyRealtimeToTree(garden, tree, reading);
  void syncTreeRecord(record);
  return record;
}

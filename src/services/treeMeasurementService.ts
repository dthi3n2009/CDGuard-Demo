import { fetchLatestFirebaseReading, measurementDatabaseUrl, FirebaseReadingResult, authenticatedDatabaseUrl, ensureFirebaseIdentity } from './firebaseService';
import { roomStorageService, DetailedMeasurement, TreeLocation } from './roomStorageService';
import { Garden } from '../types';
import { calculateCRS } from '../utils/crsCalculator';
import { isReadingFresh } from './deviceStatus';

export function recordForSelectedTree(garden: Garden, tree: TreeLocation, reading: FirebaseReadingResult, selectedAt: number, now = Date.now()): DetailedMeasurement {
  const data = reading.data;
  if (tree.gardenId !== garden.id) throw new Error('Cây không thuộc vườn đang chọn.');
  if (!reading.success || !data || data.deviceId !== garden.deviceId) throw new Error('Chưa nhận được số đo từ đúng thiết bị của vườn.');
  if (!isReadingFresh(data.ts, now) || data.ts < selectedAt) throw new Error('Chưa có số đo mới sau khi chọn cây. Hãy đo cây này rồi bấm lưu.');
  if ((data.gardenId && data.gardenId !== garden.id) || (data.treeId && data.treeId !== tree.id) ||
      (!data.treeId && data.treeName && data.treeName !== tree.name)) throw new Error('Gói đo đang gắn với cây/vườn khác. Chưa lưu vào cây này.');
  if (![data.ph, data.ec, data.moisture, data.temp].every(Number.isFinite)) throw new Error('Gói đo thiếu thông số.');
  const date = new Date(data.ts);
  const hour = date.getHours();
  return {
    id: `sensor-${encodeKey(data.deviceId)}-${data.ts}`, gardenId: garden.id, spotId: tree.id,
    deviceId: data.deviceId, locationName: tree.name, timestamp: data.ts, savedAt: now,
    dayStr: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    timeStr: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    sessionName: hour < 11 ? 'Sáng' : hour < 15 ? 'Trưa' : hour < 18 ? 'Chiều' : 'Khác',
    ph: data.ph, ec: data.ec, moisture: data.moisture, temperature: data.temp,
    crs: calculateCRS(data.ph, data.ec, data.moisture, data.temp), syncedToCloud: false,
  };
}

// Reversible encoding, including Firebase-forbidden punctuation.
function encodeKey(value: string) { return Array.from(value).map(c => c.codePointAt(0)!.toString(16)).join('-'); }
export function measurementPath(record: DetailedMeasurement) {
  return `/tree_measurements/${encodeKey(record.gardenId)}/${encodeKey(record.spotId)}/${record.id}.json`;
}

export function storeTreeRecord(record: DetailedMeasurement) {
  const tree = roomStorageService.getTreeLocations(record.gardenId).find(t => t.id === record.spotId);
  if (!tree) throw new Error('Cây đã bị xóa. Chưa lưu số đo.');
  const records = roomStorageService.getMeasurements();
  const duplicate = records.find(r => r.id === record.id);
  if (duplicate && (duplicate.gardenId !== record.gardenId || duplicate.spotId !== record.spotId)) throw new Error('Gói đo này đã lưu cho cây khác. Hãy thực hiện phép đo mới.');
  const stored = duplicate || record;
  if (!duplicate) roomStorageService.saveMeasurements([record, ...records]);
  if (!tree.lastMeasuredAt || stored.timestamp >= tree.lastMeasuredAt) {
    roomStorageService.addOrUpdateTreeLocation({ ...tree, lastPh: stored.ph, lastEc: stored.ec,
      lastMoisture: stored.moisture, lastTemp: stored.temperature, lastCrs: stored.crs, lastMeasuredAt: stored.timestamp });
  }
  return stored;
}

export async function syncTreeRecord(record: DetailedMeasurement, identity = ensureFirebaseIdentity): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Deterministic PUT makes retries idempotent. Local timestamp is never replaced.
    const uid = await identity();
    const response = await fetch(await authenticatedDatabaseUrl(measurementDatabaseUrl.replace(/\/$/, '') + `/users/${encodeURIComponent(uid)}` + measurementPath(record)), {
      method: 'PUT', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, syncedToCloud: true }),
    });
    if (!response.ok) return false;
    const all = roomStorageService.getMeasurements();
    roomStorageService.saveMeasurements(all.map(r => r.id === record.id ? { ...r, syncedToCloud: true } : r));
    return true;
  } catch { return false; }
  finally { clearTimeout(timeout); }
}

let retrying = false;
export async function retryPendingTreeMeasurements() {
  if (retrying) return;
  retrying = true;
  try {
    const pending = roomStorageService.getMeasurements().filter(r => r.deviceId && !r.syncedToCloud && r.id.startsWith('sensor-'));
    for (const record of pending) { if (!await syncTreeRecord(record)) break; }
  } finally { retrying = false; }
}

export async function saveSelectedTree(garden: Garden, tree: TreeLocation, selectedAt: number) {
  const reading = await fetchLatestFirebaseReading();
  const record = storeTreeRecord(recordForSelectedTree(garden, tree, reading, selectedAt));
  const synced = record.syncedToCloud || await syncTreeRecord(record);
  return { record, synced };
}

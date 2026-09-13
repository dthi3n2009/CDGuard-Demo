import { measurementDatabaseUrl } from './firebaseService';
import { IS_DEMO_MODE } from './demoMode';

export interface RealtimeReading {
  key: string;
  deviceId: string;
  ts: number;
  ph: number;
  ec: number; // µS/cm, exactly as sent by the sensor
  moisture: number;
  temp: number;
}

export function createDemoReading(): RealtimeReading {
  const now = Date.now();
  return {
    key: `demo-${now}`,
    deviceId: 'CDGuard Demo',
    ts: now,
    ph: Number((5.3 + Math.random() * 1.25).toFixed(2)),
    ec: Math.round(350 + Math.random() * 1100),
    moisture: Math.round(55 + Math.random() * 31),
    temp: Number((26 + Math.random() * 6).toFixed(1)),
  };
}

export function parseRealtimeReading(json: unknown): RealtimeReading {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Chưa nhận được số đo. Hãy đo rồi lấy lại.');
  const key = Object.keys(json).sort().at(-1);
  if (!key) throw new Error('Chưa nhận được số đo. Hãy đo rồi lấy lại.');
  const record = (json as Record<string, any>)[key];
  const v = record?.values;
  if (record?.device_id !== 'esp32-01') throw new Error('Bản ghi mới nhất không thuộc máy esp32-01.');
  if (!v || ![v.ph, v.ec, v.moisture, v.temp, record.ts].every(Number.isFinite)
    || record.ts <= 0 || v.ph < 0 || v.ph > 14 || v.ec < 0 || v.ec > 10000
    || v.moisture < 0 || v.moisture > 100 || v.temp < -50 || v.temp > 100) {
    throw new Error('Gói đo thiếu thông số hoặc có giá trị không hợp lệ. Hãy đo lại.');
  }
  return { key, deviceId: record.device_id, ts: record.ts, ph: v.ph, ec: v.ec, moisture: v.moisture, temp: v.temp };
}

export async function fetchRealtimeReading(signal?: AbortSignal): Promise<RealtimeReading> {
  if (IS_DEMO_MODE) return createDemoReading();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(`${measurementDatabaseUrl.replace(/\/$/, '')}/data.json?orderBy=%22%24key%22&limitToLast=20`, {
      signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Chưa lấy được số đo. Kiểm tra kết nối và thử lại.');
    return parseRealtimeReading(await response.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { SensorReading } from '../types';
import { isReadingFresh } from './deviceStatus';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const metaEnv = (import.meta as any).env || {};

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'cdguard-7700a.firebaseapp.com',
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || 'https://cdguard-7700a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'cdguard-7700a',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'cdguard-7700a.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: metaEnv.VITE_FIREBASE_APP_ID || ''
};

export const measurementDatabaseUrl = DEFAULT_FIREBASE_CONFIG.databaseURL;

let guestLogin: Promise<string> | null = null;
export function ensureFirebaseIdentity(): Promise<string> {
  if (guestLogin) return guestLogin;
  guestLogin = (async () => {
    if (Capacitor.isNativePlatform()) {
      if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) throw new Error('Bản cài thiếu Firebase Authentication.');
      const current = await FirebaseAuthentication.getCurrentUser();
      const user = current.user || (await FirebaseAuthentication.signInAnonymously()).user;
      if (!user) throw new Error('Không tạo được phiên khách Firebase.');
      return user.uid;
    }
    const app = getFirebaseApp();
    if (!app || !DEFAULT_FIREBASE_CONFIG.apiKey) throw new Error('Thiếu cấu hình Firebase cho bản web.');
    const auth = getAuth(app);
    await auth.authStateReady();
    return (auth.currentUser || (await signInAnonymously(auth)).user).uid;
  })().finally(() => { guestLogin = null; });
  return guestLogin;
}

export function cloudErrorMessage(error: unknown): string {
  const message = String((error as any)?.message || error);
  if (/configuration.not.found|operation.not.allowed|admin.restricted.operation/i.test(message)) {
    return 'Firebase chưa cho phép đăng nhập khách. Cần bật Authentication → Anonymous trong dự án CDGuard.';
  }
  return 'Chưa đồng bộ Firebase. Dữ liệu vẫn ở trên máy; kiểm tra mạng và quyền truy cập Firebase.';
}

export async function authenticatedDatabaseUrl(url: string): Promise<string> {
  let token: string | undefined;
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('FirebaseAuthentication')) {
      const current = await FirebaseAuthentication.getCurrentUser();
      if (current.user) token = (await FirebaseAuthentication.getIdToken()).token;
    } else if (DEFAULT_FIREBASE_CONFIG.apiKey) {
      const app = getFirebaseApp();
      if (app) token = await getAuth(app).currentUser?.getIdToken();
    }
  } catch { /* The caller reports pending sync if access is denied. */ }
  return token ? `${url}${url.includes('?') ? '&' : '?'}auth=${encodeURIComponent(token)}` : url;
}

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  try {
    if (!getApps().length) {
      if (DEFAULT_FIREBASE_CONFIG.apiKey || DEFAULT_FIREBASE_CONFIG.projectId) {
        firebaseApp = initializeApp(DEFAULT_FIREBASE_CONFIG);
      }
    } else {
      firebaseApp = getApps()[0];
    }
  } catch (e) {
    console.warn('Firebase initialization skipped or failed:', e);
  }
  return firebaseApp;
}

type GoogleUser = Pick<FirebaseUser, 'uid' | 'email' | 'displayName' | 'photoURL'>;

export async function getCurrentGoogleUser(): Promise<GoogleUser | null> {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) return null;
    const { user } = await FirebaseAuthentication.getCurrentUser();
    return user?.providerData.some(p => p.providerId === 'google.com') ? { ...user, photoURL: user.photoUrl } : null;
  }
  if (!DEFAULT_FIREBASE_CONFIG.apiKey) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  await auth.authStateReady();
  return auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ? auth.currentUser : null;
}

export async function loginWithGoogle(): Promise<GoogleUser | null> {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) throw new Error('Thiếu google-services.json cho com.cdguard.app. Chưa thể đăng nhập Google thật.');
    const result = await FirebaseAuthentication.signInWithGoogle();
    if (!result.user) throw new Error('Google chưa xác thực tài khoản.');
    return { ...result.user, photoURL: result.user.photoUrl };
  }
  const app = getFirebaseApp();
  if (!app || !DEFAULT_FIREBASE_CONFIG.apiKey) {
    throw new Error('Bản app chưa được cấu hình Firebase Authentication. Không thể đăng nhập Google lúc này.');
  }

  try {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err: any) {
    console.warn('Firebase popup error:', err);
    throw err;
  }
}

export async function logoutFirebase(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut();
    return;
  }
  const app = getFirebaseApp();
  if (app) {
    const auth = getAuth(app);
    await signOut(auth);
  }
}

export interface FirebaseReadingResult {
  success: boolean;
  online: boolean;
  data?: {
    deviceId: string;
    treeName?: string;
    gardenId?: string;
    treeId?: string;
    ph: number;
    ec: number; // dS/m
    moisture: number;
    temp: number;
    ts: number;
  };
  errorMsg?: string;
}

export interface SendSensorDataParams {
  deviceId?: string;
  treeName?: string;
  locationName?: string;
  ph: number;
  ec: number; // in dS/m or µS/cm
  moisture: number;
  temp: number;
  ts?: number;
}

/**
 * Sends a sensor reading to Firebase Realtime Database via REST endpoint.
 * Writes to both `/data.json` (for historical appending) and `/latest.json` (for instant retrieval).
 */
export async function sendSensorDataToFirebase(
  params: SendSensorDataParams,
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<{ success: boolean; message: string; recordKey?: string }> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const ts = params.ts || Date.now();
    const deviceId = params.deviceId || 'esp32-01';
    const treeName = params.treeName || 'Cây 1 (Gốc chính)';

    // Sensor raw EC in µS/cm (or direct value if < 50, scale to µS/cm)
    const rawEc = params.ec < 50 ? Math.round(params.ec * 1000) : Math.round(params.ec);

    const payload = {
      device_id: deviceId,
      tree_name: treeName,
      location: params.locationName || treeName,
      ts,
      values: {
        ph: parseFloat(Number(params.ph).toFixed(2)),
        ec: rawEc,
        moisture: Math.round(params.moisture),
        temp: parseFloat(Number(params.temp).toFixed(1))
      }
    };

    // 1. Post to historical /data.json
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(`${cleanUrl}/data.json`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    clearTimeout(timeoutId);

    // 2. Also asynchronously update /latest.json for direct zero-latency lookup
    fetch(`${cleanUrl}/latest.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((e) => console.warn('Latest cache update skipped:', e));

    if (response.ok) {
      const resJson = await response.json().catch(() => ({}));
      return {
        success: true,
        message: `Đã gửi thành công dữ liệu đo lên Firebase RTDB lúc ${new Date(ts).toLocaleTimeString('vi-VN')}!`,
        recordKey: resJson?.name
      };
    } else {
      // Fallback: If POST returns error, return informative message
      return {
        success: false,
        message: `Firebase phản hồi mã HTTP ${response.status}. Vui lòng kiểm tra quyền ghi (Rules) trên RTDB.`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.name === 'AbortError' 
        ? 'Thời gian chờ gửi dữ liệu quá 7 giây (Timeout).' 
        : (err?.message || 'Không thể kết nối tới Firebase Realtime Database.')
    };
  }
}

/**
 * Fetches the latest sensor record from Firebase Realtime DB via REST endpoint.
 * URL: https://cdguard-7700a-default-rtdb.asia-southeast1.firebasedatabase.app/data.json?orderBy="$key"&limitToLast=1
 */
export async function fetchLatestFirebaseReading(
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<FirebaseReadingResult> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');

    // Try reading /data.json?orderBy="$key"&limitToLast=1 first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response: Response;
    let json: any = null;

    try {
      response = await fetch(await authenticatedDatabaseUrl(`${cleanUrl}/data.json?orderBy="$key"&limitToLast=1`), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        json = await response.json();
      }
    } catch (e) {
      // ignore, will fallback
    }

    // Fallback: If orderBy fails (e.g. indexing rule), try reading /latest.json
    if (!json || typeof json !== 'object' || Object.keys(json).length === 0) {
      try {
        const latestResp = await fetch(await authenticatedDatabaseUrl(`${cleanUrl}/latest.json`), {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        if (latestResp.ok) {
          json = await latestResp.json();
        }
      } catch (e) {
        // ignore
      }
    }

    clearTimeout(timeoutId);

    if (!json || typeof json !== 'object' || Object.keys(json).length === 0) {
      return {
        success: false,
        online: false,
        errorMsg: 'Chưa có bản ghi nào trên nhánh /data hoặc /latest của Firebase'
      };
    }

    // Extract the latest record
    const record = extractRecordFromFirebaseData(json);

    if (!record) {
      return {
        success: false,
        online: false,
        errorMsg: 'Cấu trúc bản ghi Firebase không đúng định dạng'
      };
    }

    return parseRecordToReading(record);
  } catch (err: any) {
    return {
      success: false,
      online: false,
      errorMsg: err?.name === 'AbortError' ? 'Mất kết nối / Timeout Firebase (6s)' : (err?.message || 'Lỗi mạng khi đọc Firebase')
    };
  }
}

/**
 * Extracts the relevant sensor record from various Firebase JSON shapes (SSE, REST query, map).
 */
export function extractRecordFromFirebaseData(json: any): any {
  if (!json || typeof json !== 'object') return null;
  if (json.values || json.ph !== undefined) {
    return json;
  }
  if (json.data && typeof json.data === 'object') {
    return extractRecordFromFirebaseData(json.data);
  }
  const keys = Object.keys(json);
  if (keys.length > 0) {
    const lastKey = keys[keys.length - 1];
    const candidate = json[lastKey];
    if (candidate && typeof candidate === 'object') {
      return candidate.values || candidate.ph !== undefined ? candidate : extractRecordFromFirebaseData(candidate);
    }
  }
  return null;
}

/**
 * Parses raw Firebase record into normalized reading.
 */
export function parseRecordToReading(record: any): FirebaseReadingResult {
  if (!record) {
    return {
      success: false,
      online: false,
      errorMsg: 'Cấu trúc bản ghi Firebase không đúng định dạng'
    };
  }

  const values = record.values || record;
  const rawEc = values.ec ?? values.ec_val;
  const deviceId = record.device_id || record.deviceId;
  if (!deviceId || ![values.ph, rawEc, values.moisture, values.temp].every(Number.isFinite)) {
    return { success: false, online: false, errorMsg: 'Bản ghi thiếu mã thiết bị hoặc chỉ số cảm biến.' };
  }
  
  // Convert µS/cm to dS/m (rawEc > 50 indicates µS/cm)
  const ecDsm = record.values ? rawEc / 1000 : rawEc > 50 ? rawEc / 1000 : rawEc;

  const ts = typeof record.ts === 'number' ? record.ts : (typeof values.ts === 'number' ? values.ts : 0);
  const isOnline = isReadingFresh(ts);

  return {
    success: true,
    online: isOnline,
    data: {
      deviceId,
      treeName: record.tree_name || record.location,
      gardenId: record.garden_id || record.gardenId,
      treeId: record.tree_id || record.treeId,
      ph: typeof values.ph === 'number' ? parseFloat(values.ph.toFixed(2)) : 5.49,
      ec: Number(ecDsm.toFixed(3)),
      moisture: values.moisture,
      temp: typeof values.temp === 'number' ? parseFloat(values.temp.toFixed(1)) : 27.3,
      ts
    }
  };
}

/**
 * Pushes active Survey Session State to Firebase Realtime Database at `/survey_state.json`.
 * ESP32 firmware reads this node to display current Garden / Tree / Spot on OLED screen.
 */
export async function pushSurveyStateToFirebase(
  state: {
    garden_code: string;
    tree_num: number;
    spot_num: number;
    spots_per_tree?: number;
    depth?: string;
    status?: 'IDLE' | 'MEASURING' | 'TREE_DONE' | 'GARDEN_DONE';
    last_cmd?: string;
    cmd_timestamp?: number;
  },
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const payload = {
      garden_code: state.garden_code || 'A',
      tree_num: state.tree_num || 1,
      spot_num: state.spot_num || 1,
      spots_per_tree: state.spots_per_tree || 4,
      depth: state.depth || '0-20cm',
      status: state.status || 'MEASURING',
      last_cmd: state.last_cmd || 'UPDATE',
      cmd_timestamp: state.cmd_timestamp || Date.now(),
      updated_at: Date.now()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${cleanUrl}/survey_state.json`, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: 'Đã đồng bộ trạng thái đo xuống thiết bị ESP32!' };
    }
    return { success: false, message: `Lỗi kết nối Firebase (HTTP ${response.status})` };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Không thể đồng bộ trạng thái' };
  }
}

/**
 * Reads survey state from Firebase Realtime Database at `/survey_state.json`.
 */
export async function fetchSurveyStateFromFirebase(
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<{ success: boolean; data?: any }> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${cleanUrl}/survey_state.json`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Saves a completed garden survey session to Firebase RTDB at `/survey_sessions.json`.
 */
export async function saveGardenSessionToFirebase(
  sessionData: any,
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${cleanUrl}/survey_sessions.json`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sessionData,
        saved_at: Date.now()
      })
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: 'Đã lưu trữ toàn bộ hồ sơ buổi đo vườn lên máy chủ đám mây!' };
    }
    return { success: false, message: 'Lỗi lưu phiên đo lên Firebase' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Không thể lưu phiên đo' };
  }
}

export interface HardwareIncomingPayload {
  deviceId: string;
  ts: number;
  ph: number;
  ec: number; // in dS/m
  moisture: number; // in %
  temp: number; // in °C
  n?: number;
  p?: number;
  k?: number;
  action?: 'MEASURE_DONE' | 'NEXT_TREE' | 'RESET' | 'BUTTON_PRESS';
  raw?: any;
}

/**
 * Real-time Hardware Listener for Field Survey.
 * Listens to new data pushed by ESP32 via Firebase RTDB EventSource (SSE) + fast polling fallback.
 * Whenever a new timestamp is detected, triggers the callback instantly.
 */
export function subscribeToHardwareStream(
  onData: (payload: HardwareIncomingPayload) => void,
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): () => void {
  let isSubscribed = true;
  let lastProcessedTs = Date.now();
  let eventSource: EventSource | null = null;
  const cleanUrl = dbUrl.replace(/\/$/, '');

  const processIncomingRecord = (json: any) => {
    if (!json || typeof json !== 'object') return;
    
    // Extract record payload using robust extractor
    const record = extractRecordFromFirebaseData(json);
    if (!record) return;

    const values = record.values || record;
    const ts = typeof record.ts === 'number' ? record.ts : (typeof values.ts === 'number' ? values.ts : Date.now());
    
    // Check if this is a fresh reading arrived after subscription or greater than lastProcessedTs
    if (ts > lastProcessedTs) {
      lastProcessedTs = ts;
      
      const rawEc = typeof values.ec === 'number' ? values.ec : (typeof values.ec_val === 'number' ? values.ec_val : 0);
      const ecDsm = rawEc > 50 ? rawEc / 1000 : (rawEc || 0.13);

      const payload: HardwareIncomingPayload = {
        deviceId: record.device_id || record.deviceId || 'esp32-01',
        ts,
        ph: typeof values.ph === 'number' ? Number(values.ph.toFixed(2)) : 5.49,
        ec: Number(ecDsm.toFixed(2)),
        moisture: typeof values.moisture === 'number' ? Math.round(values.moisture) : 9,
        temp: typeof values.temp === 'number' ? Number(values.temp.toFixed(1)) : 27.3,
        n: typeof values.n === 'number' ? values.n : (typeof values.nitrogen === 'number' ? values.nitrogen : 85),
        p: typeof values.p === 'number' ? values.p : (typeof values.phosphorus === 'number' ? values.phosphorus : 70),
        k: typeof values.k === 'number' ? values.k : (typeof values.potassium === 'number' ? values.potassium : 95),
        action: record.action || values.action || 'MEASURE_DONE',
        raw: record
      };

      onData(payload);
    }
  };

  // 1. Connect via Server-Sent Events (SSE) stream for sub-second real-time response on /data node
  try {
    const streamUrl = `${cleanUrl}/data.json?orderBy="$key"&limitToLast=1`;
    eventSource = new EventSource(streamUrl);
    
    eventSource.addEventListener('put', (event: MessageEvent) => {
      if (!isSubscribed) return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.data) {
          processIncomingRecord(parsed.data);
        }
      } catch {
        // stream parse error fallback
      }
    });

    eventSource.addEventListener('patch', (event: MessageEvent) => {
      if (!isSubscribed) return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.data) {
          processIncomingRecord(parsed.data);
        }
      } catch {
        // stream parse error fallback
      }
    });

    eventSource.onerror = () => {
      // If SSE errors out, the polling backup below ensures reliable delivery
    };
  } catch {
    // EventSource not supported in environment
  }

  // 2. High-speed 2000ms polling fallback on /data node
  const pollingInterval = setInterval(async () => {
    if (!isSubscribed) return;
    try {
      const resp = await fetch(`${cleanUrl}/data.json?orderBy="$key"&limitToLast=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json) {
          processIncomingRecord(json);
        }
      }
    } catch {
      // ignore transient network glitch
    }
  }, 2000);

  // Return unsubscribe cleanup function
  return () => {
    isSubscribed = false;
    clearInterval(pollingInterval);
    if (eventSource) {
      eventSource.close();
    }
  };
}

export interface RealtimeGardenState {
  reading: FirebaseReadingResult;
  status: 'syncing' | 'updated' | 'disconnected' | 'error';
  lastSyncTime: number;
}

/**
 * Universal Real-time Subscriber for the main Application.
 * Combines Firebase SSE streaming and fast heartbeat polling to deliver instant 
 * sensor updates from ESP32 across the entire app.
 */
export function subscribeToGardenRealtime(
  onUpdate: (state: RealtimeGardenState) => void,
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): () => void {
  let isSubscribed = true;
  let lastSeenTs = 0;
  let eventSource: EventSource | null = null;
  const cleanUrl = dbUrl.replace(/\/$/, '');

  // 1. Immediate initial fetch
  onUpdate({
    reading: { success: false, online: false },
    status: 'syncing',
    lastSyncTime: Date.now()
  });

  fetchLatestFirebaseReading(dbUrl).then((initialRes) => {
    if (!isSubscribed) return;
    if (initialRes.success && initialRes.data) {
      lastSeenTs = initialRes.data.ts || Date.now();
      onUpdate({
        reading: initialRes,
        status: 'updated',
        lastSyncTime: Date.now()
      });
    } else {
      onUpdate({
        reading: initialRes,
        status: initialRes.errorMsg?.includes('Mất kết nối') ? 'disconnected' : 'error',
        lastSyncTime: Date.now()
      });
    }
  }).catch(() => {
    if (!isSubscribed) return;
    onUpdate({
      reading: { success: false, online: false, errorMsg: 'Lỗi kết nối Firebase' },
      status: 'disconnected',
      lastSyncTime: Date.now()
    });
  });

  const handleIncomingRecord = (json: any) => {
    if (!json || typeof json !== 'object' || !isSubscribed) return;
    const record = extractRecordFromFirebaseData(json);
    if (!record) return;

    const reading = parseRecordToReading(record);
    if (reading.success && reading.data) {
      const ts = reading.data.ts || Date.now();
      lastSeenTs = ts;
      onUpdate({
        reading,
        status: 'updated',
        lastSyncTime: Date.now()
      });
    }
  };

  // 2. Open EventSource for live SSE push from Firebase RTDB
  try {
    const streamUrl = `${cleanUrl}/data.json?orderBy="$key"&limitToLast=1`;
    eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('put', (event: MessageEvent) => {
      if (!isSubscribed) return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.data) {
          handleIncomingRecord(parsed.data);
        }
      } catch {
        // stream parse fallback
      }
    });

    eventSource.addEventListener('patch', (event: MessageEvent) => {
      if (!isSubscribed) return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.data) {
          handleIncomingRecord(parsed.data);
        }
      } catch {
        // stream parse fallback
      }
    });

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };
  } catch {
    // SSE not supported
  }

  // 3. Fast heartbeat polling (every 3 seconds) for redundancy & connection health checking
  const heartbeatInterval = setInterval(async () => {
    if (!isSubscribed) return;
    try {
      const res = await fetchLatestFirebaseReading(dbUrl);
      if (!isSubscribed) return;
      if (res.success && res.data) {
        const ts = res.data.ts || Date.now();
        if (ts !== lastSeenTs) {
          lastSeenTs = ts;
        }
        onUpdate({
          reading: res,
          status: 'updated',
          lastSyncTime: Date.now()
        });
      } else {
        onUpdate({
          reading: res,
          status: 'disconnected',
          lastSyncTime: Date.now()
        });
      }
    } catch {
      if (!isSubscribed) return;
      onUpdate({
        reading: { success: false, online: false, errorMsg: 'Mất kết nối mạng' },
        status: 'disconnected',
        lastSyncTime: Date.now()
      });
    }
  }, 3500);

  return () => {
    isSubscribed = false;
    clearInterval(heartbeatInterval);
    if (eventSource) {
      eventSource.close();
    }
  };
}

/**
 * Simulates a physical ESP32 button press / sensor reading push over 4G to Firebase.
 * Writes to `/data.json` using POST to match the ESP32 hardware behavior.
 */
export async function simulateHardwarePush(
  reading: {
    ph?: number;
    ec?: number; // in dS/m
    moisture?: number;
    temp?: number;
    n?: number;
    p?: number;
    k?: number;
    action?: 'MEASURE_DONE' | 'NEXT_TREE' | 'RESET';
    tree_num?: number;
    spot_num?: number;
  },
  dbUrl: string = DEFAULT_FIREBASE_CONFIG.databaseURL
): Promise<{ success: boolean }> {
  try {
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const ts = Date.now();
    const payload = {
      device_id: 'esp32-01',
      ts,
      tree_num: reading.tree_num || 1,
      spot_num: reading.spot_num || 1,
      action: reading.action || 'MEASURE_DONE',
      values: {
        ph: reading.ph ?? Number((5.3 + Math.random() * 0.4).toFixed(2)),
        ec: reading.ec ? Math.round(reading.ec * 1000) : 132, // µS/cm
        moisture: reading.moisture ?? Number((8.5 + Math.random() * 1.5).toFixed(1)),
        temp: reading.temp ?? Number((27.0 + Math.random() * 0.8).toFixed(1)),
        n: reading.n ?? Math.round(80 + Math.random() * 20),
        p: reading.p ?? Math.round(70 + Math.random() * 15),
        k: reading.k ?? Math.round(90 + Math.random() * 20)
      }
    };

    const response = await fetch(`${cleanUrl}/data.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

export type CRSLevel = 'safe' | 'caution' | 'warning' | 'high_risk';

export interface CRSResult {
  score: number;
  level: CRSLevel;
  levelText: string;
  color: string;
  bgLightColor: string;
  borderColor: string;
  mainCause: string;
  rootCauses: string[];
}

export interface Garden {
  id: string;
  deviceId: string;
  name: string;
  province: string;
  district: string;
  area: number; // công đất (1 công = 1000m2)
  shape?: 'rectangle' | 'square' | 'custom'; // Hình dạng khuôn viên vườn (vuông / chữ nhật)
  length?: number; // Chiều dài (mét)
  width?: number; // Chiều rộng (mét)
  // Vị trí 4 góc & ở giữa vườn (Địa hình, cảnh quan)
  cornerTopLeft?: string; // Góc 1 (Đầu liếp - Trái): ví dụ gần mương ngọt, giếng khoan
  cornerTopRight?: string; // Góc 2 (Đầu liếp - Phải): ví dụ gần đường lộ, trạm bơm
  cornerBottomLeft?: string; // Góc 3 (Cuối liếp - Trái): ví dụ rãnh thoát phèn
  cornerBottomRight?: string; // Góc 4 (Cuối liếp - Phải): ví dụ đê bao, sông lớn
  centerLandmark?: string; // Ở giữa vườn: ví dụ gò đất cao ráo, liếp trũng, rãnh xẻ đôi
  terrainFeatures?: string[]; // Gò cao, trũng thấp, gần mương, bằng phẳng...
  soilType: string; // phù sa, đất phèn, đất xám, đất cát pha
  crop: string; // sầu riêng, xoài, lúa
  age: number; // năm tuổi vườn/cây
  waterSource: string; // nguồn nước tưới
  fertilizerType: string; // loại phân bón
  ph: number;
  ec: number; // dS/m
  moisture: number; // %
  temperature: number; // °C
  battery: number; // %
  online: boolean;
  lastUpdated: number;
}

export interface ConfigHistoryItem {
  id: string;
  timestamp: number;
  dateStr: string; // e.g. "04/09/2026 15:30"
  type: 'garden' | 'tree';
  targetId: string;
  targetName: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  changes?: { field: string; oldVal?: any; newVal?: any }[];
}

export interface SensorReading {
  timestamp: number;
  ph: number;
  ec: number; // dS/m
  moisture: number;
  temperature: number;
  crs: number;
}

export interface DeviceInfo {
  deviceId: string;
  stationName: string;
  status: 'online' | 'offline';
  signalDbm: number;
  battery: number;
  lastSentTime: number;
  intervalSec: number;
  firmwareVersion: string;
  firebaseConnected: boolean;
  sensorType: string;
  mcuType: string;
  moduleType: string;
  displayType: string;
}

export interface RemediationTask {
  id: string;
  title: string;
  period: 'immediate' | 'short_term' | 'long_term';
  costTier: 'low' | 'medium' | 'high';
  completed: boolean;
  description: string;
  impact: string;
  category: 'ph' | 'ec' | 'moisture' | 'general';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isAlert?: boolean;
}

export interface ConsultationSession {
  id: string;
  timestamp: number;
  dateStr: string;
  gardenName: string;
  summary: string;
  messages: ChatMessage[];
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isDemo: boolean;
  isDevMode: boolean;
}

export interface AppSettings {
  authMode: 'none' | 'google' | 'demo' | 'dev';
  onboardingCompleted: boolean;
  currentGardenId: string;
  autoFluctuateInDev: boolean;
}

export type SyncStatusState = 'syncing' | 'updated' | 'disconnected' | 'error';

export interface TreeLocationInfo {
  id: string;
  gardenId: string;
  spotNumber: number;
  name: string;
  variety: string;
  treeAge: number;
  height: number;
  canopyWidth: number;
  notes?: string;
  row?: number;
  col?: number;
  lastPh?: number;
  lastEc?: number;
  lastMoisture?: number;
  lastTemp?: number;
  lastCrs?: number;
  lastMeasuredAt?: number;
}

export interface DetailedMeasurementRecord {
  id: string;
  gardenId: string;
  spotId: string;
  locationName: string;
  timestamp: number;
  dayStr: string;
  timeStr: string;
  sessionName: 'Sáng' | 'Trưa' | 'Chiều' | 'Khác';
  ph: number;
  ec: number;
  moisture: number;
  temperature: number;
  crs: number;
  syncedToCloud: boolean;
}

export interface FertilizerLogEntry {
  id: string;
  gardenId: string;
  spotId?: string;
  dateStr?: string;
  date?: string;
  type: 'fertilizer' | 'pesticide';
  productName: string;
  dosage?: string;
  amount?: string;
  purpose?: string;
  targetArea?: string;
  notes?: string;
}

export type TreeContextFlag = 
  | 'near_canal'      // Gần mương
  | 'near_bank'       // Gần bờ
  | 'near_water_src'  // Gần nguồn nước tưới
  | 'low_land'        // Vùng trũng
  | 'high_land'       // Vùng cao
  | 'middle_garden'   // Giữa vườn
  | 'frequent_irrigation'; // Khu thường tưới

export interface FieldMeasurement {
  id: string;
  code: string;           // Mã chuẩn: A-03-2 (Vườn-Gốc-Vị trí)
  gardenCode: string;     // 'A', 'B', 'C'...
  gardenId: string;
  treeIndex: number;      // 1, 2, 3... (Gốc 01, 02...)
  spotIndex: number;      // 1, 2, 3, 4 (Vị trí quanh gốc)
  spotDescription: string; // 'Sát gốc (30cm)', 'Mép tán ngoài'...
  depthLayer: '0-20cm' | '20-40cm';
  treeFlags?: TreeContextFlag[];
  timestamp: number;
  timeStr: string;
  dateStr: string;
  
  // 7-in-1 Sensor Parameters
  ph: number;
  ec: number;             // dS/m
  moisture: number;       // %
  temperature: number;    // °C
  n?: number;             // Nitrogen rel index
  p?: number;             // Phosphorus rel index
  k?: number;             // Potassium rel index

  // CRS Cadmium Risk Score (0-100)
  crs: number;

  // Soft-delete mechanism (Khoa học & Không mất dấu)
  isExcluded?: boolean;
  exclusionReason?: string;
  
  // Session tracking
  sessionId: string;
  sessionName?: string;
  syncedToCloud: boolean;
}

export interface TreeSummary {
  treeIndex: number;
  treeCode: string; // 'A-01'
  gardenCode: string;
  totalSpots: number;
  avgPh: number;
  avgEc: number;
  avgMoisture: number;
  avgTemp: number;
  avgCrs: number;
  crsLevel: CRSLevel;
  flags: TreeContextFlag[];
  measurements: FieldMeasurement[];
  isCompleted: boolean;
  completedAt?: number;
  notes?: string;
}

export interface GardenSurveySession {
  id: string;
  gardenId: string;
  gardenCode: string;       // 'A', 'B', 'C'
  gardenName: string;
  startedAt: number;
  completedAt?: number;
  status: 'in_progress' | 'completed' | 'paused';
  
  // Progress state
  currentTreeIndex: number;  // 1 -> 8 (đang đo gốc số mấy)
  currentSpotIndex: number;  // 1 -> 4 (đang đo vị trí số mấy)
  spotsPerTree: number;      // Mặc định 4 vị trí quanh gốc
  depthLayer: '0-20cm' | '20-40cm';
  targetTreeCount: number;   // Mục tiêu số gốc (VD: 8 gốc)
  
  // Data
  measurements: FieldMeasurement[];
  completedTrees: TreeSummary[];
  sketchImageUrl?: string;   // Ảnh sơ đồ vườn vẽ tay
  notes?: string;
}

export interface FirmwareSurveySyncState {
  garden_code: string;       // 'A'
  tree_num: number;          // 1, 2, 3...
  spot_num: number;          // 1, 2, 3, 4
  spots_per_tree: number;    // 4
  depth: string;             // '0-20cm'
  status: 'IDLE' | 'MEASURING' | 'TREE_DONE' | 'GARDEN_DONE';
  last_cmd?: 'NEXT_SPOT' | 'NEXT_TREE' | 'RESET_GARDEN' | 'TRIGGER_MEASURE';
  cmd_timestamp?: number;
  last_reading?: {
    ph: number;
    ec: number;
    moisture: number;
    temp: number;
    n: number;
    p: number;
    k: number;
    crs: number;
    ts: number;
  };
}


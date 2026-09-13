import { Garden, SensorReading, ConfigHistoryItem } from '../types';
import { SPOT_LOCATIONS } from './demoDataService';
import { PHI_YEN_GARDEN_ID, PHI_YEN_READINGS } from '../data/phiYenReadings';
import { calculateCRS } from '../utils/crsCalculator';

export type SyncState = 'syncing' | 'updated' | 'disconnected' | 'error';

export interface TreeLocation {
  id: string;
  gardenId: string;
  spotNumber: number;
  name: string; // e.g., "Cây #1 - Gốc Đông"
  variety: string; // Giống cây: e.g. "Sầu riêng Ri6", "Monthong", "Musang King"
  treeAge: number; // Tuổi cây (năm)
  height: number; // Chiều cao (m)
  canopyWidth: number; // Độ rộng tán (m)
  notes?: string;
  landmarkLocation?: string; // Vị trí cụ thể: Góc 1 (Đầu liếp - Trái), Ở giữa vườn, Trên gò cao, Gần mương...
  row?: number;
  col?: number;
  lastPh?: number;
  lastEc?: number;
  lastMoisture?: number;
  lastTemp?: number;
  lastCrs?: number;
  lastMeasuredAt?: number;
}

export interface DetailedMeasurement {
  deviceId?: string;
  savedAt?: number;
  id: string;
  gardenId: string;
  spotId: string;
  locationName: string;
  timestamp: number;
  dayStr: string; // "DD/MM" or "YYYY-MM-DD"
  timeStr: string; // "HH:mm"
  sessionName: 'Sáng' | 'Trưa' | 'Chiều' | 'Khác';
  ph: number;
  ec: number;
  moisture: number;
  temperature: number;
  crs: number;
  syncedToCloud: boolean;
  notes?: string;
}

export interface FertilizerLogItem {
  id: string;
  gardenId: string;
  spotId?: string;
  dateStr: string;
  type: 'fertilizer' | 'pesticide';
  productName: string; // e.g. "NPK 16-16-8", "Vôi nông nghiệp", "Axit Humic", "Trichoderma"
  dosage: string; // e.g. "500g/gốc", "2kg/công"
  purpose: string; // e.g. "Hạ chua nâng pH", "Rửa mặn", "Phòng nấm Phytophthora"
  notes?: string;
}

export interface DiseaseAnalysisResult {
  id: string;
  gardenId: string;
  timestamp: number;
  dateStr: string;
  imageUrl: string;
  diseaseName: string;
  confidence: number;
  description: string;
  treatment: string;
}

const ROOM_KEYS = {
  TREES: 'room_tree_locations',
  MEASUREMENTS: 'room_measurements',
  FERTILIZERS: 'room_fertilizer_logs',
  DISEASES: 'room_disease_scans',
  SYNC_STATUS: 'room_sync_status',
  PENDING_SYNC: 'room_pending_sync_queue',
  CONFIG_HISTORY: 'room_config_history'
};

/**
 * Room Storage Service - Simulates Room Database with Local Cache,
 * SQLite-like indexing, offline persistence, and cloud sync queue management.
 */
export const roomStorageService = {
  seedPhiYenMeasurements(): void {
    const existingTrees = this.getTreeLocations(PHI_YEN_GARDEN_ID);
    if (existingTrees.length === 0) {
      const trees: TreeLocation[] = Array.from({ length: 15 }, (_, index) => {
        const treeNumber = index + 1;
        const readings = PHI_YEN_READINGS.filter(reading => Number(reading.treeId.slice(1)) === treeNumber);
        const average = (key: 'ph' | 'ec' | 'moisture' | 'temperature') => readings.reduce((sum, reading) => sum + reading[key], 0) / readings.length;
        const lastMeasuredAt = Math.max(...readings.map(reading => reading.timestamp));
        const lastPh = average('ph');
        const lastEc = average('ec');
        const lastMoisture = average('moisture');
        const lastTemp = average('temperature');
        return {
        id: `${PHI_YEN_GARDEN_ID}-tree-${index + 1}`,
        gardenId: PHI_YEN_GARDEN_ID,
        spotNumber: treeNumber,
        name: `Cây ${String(treeNumber).padStart(2, '0')}`,
        variety: 'Sầu riêng Ri6', treeAge: 0, height: 0, canopyWidth: 0,
        row: Math.floor(index / 3) + 1, col: (index % 3) + 1,
        lastPh, lastEc, lastMoisture, lastTemp, lastMeasuredAt,
        lastCrs: calculateCRS(lastPh, lastEc, lastMoisture, lastTemp),
        notes: 'Dữ liệu đo ngày 05/09/2026'
      };
      });
      this.saveTreeLocations([...this.getTreeLocations(), ...trees]);
    }
    const existing = this.getMeasurements(PHI_YEN_GARDEN_ID);
    if (existing.length > 0) return;
    const records: DetailedMeasurement[] = PHI_YEN_READINGS.map(reading => ({
      id: reading.id, gardenId: PHI_YEN_GARDEN_ID,
      spotId: `${PHI_YEN_GARDEN_ID}-tree-${Number(reading.treeId.slice(1))}`,
      locationName: `Cây ${Number(reading.treeId.slice(1))} — điểm ${reading.spot}`,
      timestamp: reading.timestamp,
      dayStr: new Date(reading.timestamp).toLocaleDateString('vi-VN'),
      timeStr: new Date(reading.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sessionName: 'Trưa', ph: reading.ph, ec: reading.ec, moisture: reading.moisture,
      temperature: reading.temperature,
      crs: calculateCRS(reading.ph, reading.ec, reading.moisture, reading.temperature),
      syncedToCloud: true, notes: reading.phase === 'sau-mua' ? 'Sau mưa' : 'Trước mưa'
    }));
    this.saveMeasurements([...this.getMeasurements(), ...records]);
  },
  subscribeTreeLocations(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ROOM_KEYS.TREES || event.key === null) listener();
    };
    window.addEventListener('cdguard:trees-changed', listener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cdguard:trees-changed', listener);
      window.removeEventListener('storage', onStorage);
    };
  },

  getNextTreeNumber(gardenId: string): number {
    return this.getTreeLocations(gardenId).reduce((max, tree) => Math.max(max, tree.spotNumber), 0) + 1;
  },
  // --- TREE LOCATIONS MANAGEMENT ---
  getTreeLocations(gardenId?: string): TreeLocation[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.TREES);
      let list: TreeLocation[] = data ? JSON.parse(data) : [];
      

      if (gardenId) {
        return list.filter(t => t.gardenId === gardenId);
      }
      return list;
    } catch (e) {
      console.error('[Room DB] Error loading tree locations:', e);
      return [];
    }
  },

  saveTreeLocations(trees: TreeLocation[]): void {
    try {
      localStorage.setItem(ROOM_KEYS.TREES, JSON.stringify(trees));
      window.dispatchEvent(new Event('cdguard:trees-changed'));
    } catch (e) {
      console.error('[Room DB] Error saving tree locations:', e);
    }
  },

  addOrUpdateTreeLocation(tree: TreeLocation): TreeLocation[] {
    const all = this.getTreeLocations();
    const idx = all.findIndex(t => t.id === tree.id);
    if (idx >= 0) {
      all[idx] = tree;
    } else {
      all.push(tree);
    }
    this.saveTreeLocations(all);
    return all.filter(t => t.gardenId === tree.gardenId);
  },

  deleteTreeLocation(id: string): void {
    const all = this.getTreeLocations();
    const updated = all.filter(t => t.id !== id);
    this.saveTreeLocations(updated);
  },

  // --- MEASUREMENTS HISTORY MANAGEMENT ---
  getMeasurements(gardenId?: string, spotId?: string, fromDate?: string, toDate?: string): DetailedMeasurement[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.MEASUREMENTS);
      let list: DetailedMeasurement[] = data ? JSON.parse(data) : [];

      if (gardenId) {
        list = list.filter(m => m.gardenId === gardenId);
      }
      if (spotId && spotId !== 'all') {
        list = list.filter(m => m.spotId === spotId || m.locationName.includes(spotId));
      }
      if (fromDate) {
        const fromTs = new Date(fromDate).getTime();
        if (!isNaN(fromTs)) {
          list = list.filter(m => m.timestamp >= fromTs);
        }
      }
      if (toDate) {
        const toTs = new Date(toDate).getTime() + (24 * 3600 * 1000 - 1);
        if (!isNaN(toTs)) {
          list = list.filter(m => m.timestamp <= toTs);
        }
      }

      return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('[Room DB] Error reading measurements:', e);
      return [];
    }
  },

  saveMeasurements(records: DetailedMeasurement[]): void {
    try {
      localStorage.setItem(ROOM_KEYS.MEASUREMENTS, JSON.stringify(records));
    } catch (e) {
      console.error('[Room DB] Error saving measurements:', e);
      throw e;
    }
  },

  addMeasurement(record: DetailedMeasurement): void {
    const all = this.getMeasurements();
    all.unshift(record);
    this.saveMeasurements(all);
    
    // Add to pending sync queue if offline
    if (!record.syncedToCloud) {
      this.enqueuePendingSync(record);
    }
  },

  deleteMeasurement(id: string): void {
    const data = localStorage.getItem(ROOM_KEYS.MEASUREMENTS);
    if (!data) return;
    const list: DetailedMeasurement[] = JSON.parse(data);
    const updated = list.filter(m => m.id !== id);
    this.saveMeasurements(updated);
  },

  // --- FERTILIZER & PESTICIDE LOGS ---
  getFertilizerLogs(gardenId?: string): FertilizerLogItem[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.FERTILIZERS);
      let list: FertilizerLogItem[] = data ? JSON.parse(data) : [];
      if (list.length === 0) {
        // Seed initial sample logs
        list = [
          {
            id: 'fert-1',
            gardenId: 'iot',
            dateStr: '2026-08-08',
            type: 'fertilizer',
            productName: 'Vôi Nông Nghiệp CaCO3',
            dosage: '25kg / 3.5 công',
            purpose: 'Bón lót nâng pH đất từ 5.8 lên 6.4 quanh gốc',
            notes: 'Bón sau đợt mưa rào nhẹ'
          },
          {
            id: 'fert-2',
            gardenId: 'iot',
            dateStr: '2026-08-05',
            type: 'fertilizer',
            productName: 'Phân Hữu Cơ Vi Sinh & Humic',
            dosage: '5kg / gốc cổ thụ',
            purpose: 'Bổ sung chất mùn hữu cơ, cố định ion kim loại nặng',
            notes: 'Tải mùn tốt quanh rãnh rễ'
          },
          {
            id: 'fert-3',
            gardenId: 'iot',
            dateStr: '2026-08-01',
            type: 'pesticide',
            productName: 'Nấm Kháng Vi Sinh Trichoderma',
            dosage: '100g / 20 lít nước',
            purpose: 'Tưới sinh học ngăn xì mủ gốc và bảo vệ rễ tơ',
            notes: 'Phun đều quanh tán lá và gốc'
          }
        ];
        this.saveFertilizerLogs(list);
      }
      if (gardenId) {
        return list.filter(f => f.gardenId === gardenId);
      }
      return list;
    } catch (e) {
      console.error('[Room DB] Error reading fertilizer logs:', e);
      return [];
    }
  },

  saveFertilizerLogs(logs: FertilizerLogItem[]): void {
    try {
      localStorage.setItem(ROOM_KEYS.FERTILIZERS, JSON.stringify(logs));
    } catch (e) {
      console.error('[Room DB] Error saving fertilizer logs:', e);
    }
  },

  addFertilizerLog(log: FertilizerLogItem): void {
    const all = this.getFertilizerLogs();
    all.unshift(log);
    this.saveFertilizerLogs(all);
  },

  deleteFertilizerLog(id: string): void {
    const all = this.getFertilizerLogs();
    const updated = all.filter(f => f.id !== id);
    this.saveFertilizerLogs(updated);
  },

  // --- DISEASE SCANS ---
  getDiseaseScans(gardenId?: string): DiseaseAnalysisResult[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.DISEASES);
      let list: DiseaseAnalysisResult[] = data ? JSON.parse(data) : [];
      if (gardenId) {
        return list.filter(d => d.gardenId === gardenId);
      }
      return list;
    } catch (e) {
      console.error('[Room DB] Error reading disease scans:', e);
      return [];
    }
  },

  saveDiseaseScan(scan: DiseaseAnalysisResult): void {
    try {
      const all = this.getDiseaseScans();
      all.unshift(scan);
      localStorage.setItem(ROOM_KEYS.DISEASES, JSON.stringify(all));
    } catch (e) {
      console.error('[Room DB] Error saving disease scan:', e);
    }
  },

  // --- PENDING SYNC QUEUE FOR OFFLINE SYNC ---
  enqueuePendingSync(record: DetailedMeasurement): void {
    try {
      const queueData = localStorage.getItem(ROOM_KEYS.PENDING_SYNC);
      const queue: DetailedMeasurement[] = queueData ? JSON.parse(queueData) : [];
      queue.push(record);
      localStorage.setItem(ROOM_KEYS.PENDING_SYNC, JSON.stringify(queue));
    } catch (e) {
      console.error('[Room DB] Error queuing pending sync:', e);
    }
  },

  getPendingSyncQueue(): DetailedMeasurement[] {
    try {
      const queueData = localStorage.getItem(ROOM_KEYS.PENDING_SYNC);
      return queueData ? JSON.parse(queueData) : [];
    } catch (e) {
      return [];
    }
  },

  clearPendingSyncQueue(): void {
    localStorage.removeItem(ROOM_KEYS.PENDING_SYNC);
  },

  // --- CONFIGURATION AUDIT & HISTORY MANAGEMENT ---
  getConfigHistory(targetId?: string, type?: 'garden' | 'tree'): ConfigHistoryItem[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.CONFIG_HISTORY);
      let list: ConfigHistoryItem[] = data ? JSON.parse(data) : [];
      if (list.length === 0) {
        // Initial sample seed history
        list = [
          {
            id: 'hist-init-1',
            timestamp: Date.now() - 86400000 * 2,
            dateStr: new Date(Date.now() - 86400000 * 2).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            type: 'garden',
            targetId: 'iot',
            targetName: 'Vườn 5 Cây Sầu Riêng Cai Lậy',
            action: 'create',
            summary: 'Khởi tạo cấu hình vườn (70m x 50m, 4 góc & gò đất cao ráo)'
          }
        ];
        this.saveConfigHistory(list);
      }
      if (targetId) {
        list = list.filter(h => h.targetId === targetId);
      }
      if (type) {
        list = list.filter(h => h.type === type);
      }
      return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('[Room DB] Error loading config history:', e);
      return [];
    }
  },

  saveConfigHistory(history: ConfigHistoryItem[]): void {
    try {
      localStorage.setItem(ROOM_KEYS.CONFIG_HISTORY, JSON.stringify(history.slice(0, 100))); // keep latest 100 entries
    } catch (e) {
      console.error('[Room DB] Error saving config history:', e);
    }
  },

  addConfigHistory(entry: Omit<ConfigHistoryItem, 'id' | 'timestamp' | 'dateStr'>): ConfigHistoryItem {
    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = `${dateObj.toLocaleDateString('vi-VN')} ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const newRecord: ConfigHistoryItem = {
      ...entry,
      id: `hist-${now}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      dateStr
    };
    const all = this.getConfigHistory();
    all.unshift(newRecord);
    this.saveConfigHistory(all);
    return newRecord;
  }
};

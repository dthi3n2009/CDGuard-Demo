import { Garden, SensorReading, ConfigHistoryItem } from '../types';
import { SPOT_LOCATIONS } from './demoDataService';

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
  // --- TREE LOCATIONS MANAGEMENT ---
  getTreeLocations(gardenId?: string): TreeLocation[] {
    try {
      const data = localStorage.getItem(ROOM_KEYS.TREES);
      let list: TreeLocation[] = data ? JSON.parse(data) : [];
      
      // Seed 5 standard durian trees if empty or if containing legacy probe spot names
      const hasLegacyNames = list.some(t => t.name.includes('(0.3m)') || t.name.includes('(1.5m)'));
      if ((list.length === 0 || hasLegacyNames) && (!gardenId || gardenId === 'iot')) {
        const DEFAULT_TREES: TreeLocation[] = [
          {
            id: 'tree-iot-1',
            gardenId: 'iot',
            spotNumber: 1,
            row: 1,
            col: 1,
            name: 'Cây Sầu Riêng #1',
            variety: 'Sầu riêng Ri6',
            treeAge: 15,
            height: 8.5,
            canopyWidth: 7.0,
            lastPh: 6.2,
            lastEc: 0.25,
            lastMoisture: 70,
            lastTemp: 28.0,
            lastCrs: 22,
            lastMeasuredAt: Date.now() - 3600000,
            notes: 'Gốc cao ráo, tán lá sum suê'
          },
          {
            id: 'tree-iot-2',
            gardenId: 'iot',
            spotNumber: 2,
            row: 1,
            col: 2,
            name: 'Cây Sầu Riêng #2',
            variety: 'Sầu riêng Ri6',
            treeAge: 15,
            height: 8.8,
            canopyWidth: 7.2,
            lastPh: 6.4,
            lastEc: 0.22,
            lastMoisture: 72,
            lastTemp: 28.0,
            lastCrs: 20,
            lastMeasuredAt: Date.now() - 7200000,
            notes: 'Cây trung tâm vườn, rễ phát triển tốt'
          },
          {
            id: 'tree-iot-3',
            gardenId: 'iot',
            spotNumber: 3,
            row: 1,
            col: 3,
            name: 'Cây Sầu Riêng #3',
            variety: 'Sầu riêng Ri6',
            treeAge: 15,
            height: 8.0,
            canopyWidth: 6.8,
            lastPh: 5.8,
            lastEc: 0.32,
            lastMoisture: 76,
            lastTemp: 27.5,
            lastCrs: 42,
            lastMeasuredAt: Date.now() - 10800000,
            notes: 'Gần mương tưới, đất hơi chua nhẹ'
          },
          {
            id: 'tree-iot-4',
            gardenId: 'iot',
            spotNumber: 4,
            row: 2,
            col: 1,
            name: 'Cây Sầu Riêng #4',
            variety: 'Sầu riêng Monthong',
            treeAge: 12,
            height: 7.5,
            canopyWidth: 6.2,
            lastPh: 6.5,
            lastEc: 0.20,
            lastMoisture: 68,
            lastTemp: 28.5,
            lastCrs: 18,
            lastMeasuredAt: Date.now() - 14400000,
            notes: 'Gốc hướng Nam, thông thoáng'
          },
          {
            id: 'tree-iot-5',
            gardenId: 'iot',
            spotNumber: 5,
            row: 2,
            col: 2,
            name: 'Cây Sầu Riêng #5',
            variety: 'Sầu riêng Monthong',
            treeAge: 12,
            height: 7.8,
            canopyWidth: 6.5,
            lastPh: 6.3,
            lastEc: 0.24,
            lastMoisture: 71,
            lastTemp: 28.0,
            lastCrs: 21,
            lastMeasuredAt: Date.now() - 18000000,
            notes: 'Gốc hướng Bắc, bộ rễ khỏe mạnh'
          }
        ];
        // Retain non-iot trees if any, replace iot trees
        const others = list.filter(t => t.gardenId !== 'iot');
        list = [...others, ...DEFAULT_TREES];
        this.saveTreeLocations(list);
      }

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

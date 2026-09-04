import { Garden, AppSettings, RemediationTask, ChatMessage, UserProfile, ConsultationSession } from '../types';
import { DEFAULT_GARDEN, SpotMeasurement } from './demoDataService';

const STORAGE_KEYS = {
  GARDENS: 'cdguard_gardens',
  SETTINGS: 'cdguard_settings',
  TASKS: 'cdguard_remediation_tasks',
  CHAT_HISTORY: 'cdguard_chat_history',
  USER_PROFILE: 'cdguard_user_profile',
  ARCHIVED_SESSIONS: 'cdguard_archived_consultations',
  CUSTOM_SPOTS: 'cdguard_custom_spot_measurements',
  DELETED_SPOTS: 'cdguard_deleted_spot_ids'
};

export const localStorageService = {
  getGardens(): Garden[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GARDENS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Return saved gardens ensuring shape, dimensions, and age are properly populated
          return parsed.map((g: any) => ({
            ...DEFAULT_GARDEN,
            ...g,
            shape: g.shape || DEFAULT_GARDEN.shape || 'rectangle',
            length: g.length || DEFAULT_GARDEN.length || 70,
            width: g.width || DEFAULT_GARDEN.width || 50,
            age: g.age || DEFAULT_GARDEN.age || 15
          }));
        }
      }
    } catch (e) {
      console.error('Error reading gardens from localStorage', e);
    }
    return [DEFAULT_GARDEN];
  },

  saveGardens(gardens: Garden[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GARDENS, JSON.stringify(gardens));
    } catch (e) {
      console.error('Error saving gardens to localStorage', e);
    }
  },

  updateGarden(garden: Garden): void {
    const gardens = this.getGardens();
    const idx = gardens.findIndex(g => g.id === garden.id);
    if (idx >= 0) {
      gardens[idx] = garden;
    } else {
      gardens.push(garden);
    }
    this.saveGardens(gardens);
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading settings from localStorage', e);
    }
    return {
      authMode: 'demo',
      onboardingCompleted: true,
      currentGardenId: 'iot',
      autoFluctuateInDev: false
    };
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to localStorage', e);
    }
  },

  getTasks(): RemediationTask[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading tasks', e);
    }
    return [];
  },

  saveTasks(tasks: RemediationTask[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving tasks', e);
    }
  },

  getChatHistory(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading chat history', e);
    }
    return [];
  },

  saveChatHistory(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history', e);
    }
  },

  getUserProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading user profile', e);
    }
    return null;
  },

  saveUserProfile(profile: UserProfile | null): void {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      }
    } catch (e) {
      console.error('Error saving user profile', e);
    }
  },

  getArchivedSessions(): ConsultationSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARCHIVED_SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading archived sessions', e);
    }
    return [];
  },

  saveArchivedSessions(sessions: ConsultationSession[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCHIVED_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error saving archived sessions', e);
    }
  },

  archiveCurrentChatSession(messages: ChatMessage[], gardenName: string): ConsultationSession | null {
    if (!messages || messages.length === 0) return null;

    // Extract first user query or primary assistant response as session summary
    const firstUserMsg = messages.find(m => m.sender === 'user');
    const summary = firstUserMsg 
      ? `Tư vấn: ${firstUserMsg.text.slice(0, 60)}${firstUserMsg.text.length > 60 ? '...' : ''}`
      : `Lượt tư vấn kỹ thuật sầu riêng (${messages.length} tin nhắn)`;

    const newSession: ConsultationSession = {
      id: 'sess-' + Date.now(),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      gardenName,
      summary,
      messages
    };

    const existing = this.getArchivedSessions();
    const updated = [newSession, ...existing];
    this.saveArchivedSessions(updated);

    // Clear active chat after archiving
    this.saveChatHistory([]);

    return newSession;
  },

  getCustomSpotMeasurements(gardenId: string): SpotMeasurement[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.CUSTOM_SPOTS}_${gardenId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading custom spot measurements', e);
    }
    return [];
  },

  saveCustomSpotMeasurements(gardenId: string, spots: SpotMeasurement[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CUSTOM_SPOTS}_${gardenId}`, JSON.stringify(spots));
    } catch (e) {
      console.error('Error saving custom spot measurements', e);
    }
  },

  addCustomSpotMeasurement(gardenId: string, spot: SpotMeasurement): void {
    const existing = this.getCustomSpotMeasurements(gardenId);
    const updated = [spot, ...existing];
    this.saveCustomSpotMeasurements(gardenId, updated);
  },

  getDeletedSpotIds(gardenId: string): string[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.DELETED_SPOTS}_${gardenId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading deleted spot ids', e);
    }
    return [];
  },

  saveDeletedSpotIds(gardenId: string, ids: string[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.DELETED_SPOTS}_${gardenId}`, JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving deleted spot ids', e);
    }
  },

  addDeletedSpotId(gardenId: string, id: string): void {
    const existing = this.getDeletedSpotIds(gardenId);
    if (!existing.includes(id)) {
      this.saveDeletedSpotIds(gardenId, [...existing, id]);
    }
  }
};

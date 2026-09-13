import React, { useEffect, useState } from 'react';
import { authenticatedDatabaseUrl, ensureFirebaseIdentity, measurementDatabaseUrl } from '../services/firebaseService';
import { retryPendingTreeMeasurements } from '../services/treeMeasurementService';
import { IS_DEMO_MODE } from '../services/demoMode';

// One private snapshot for the current Firebase identity. No invented readings.
export function readGardenSnapshot() {
  return {
    gardens: JSON.parse(localStorage.getItem('cdguard_gardens') || '[]'),
    trees: JSON.parse(localStorage.getItem('room_tree_locations') || '[]'),
    measurements: JSON.parse(localStorage.getItem('room_measurements') || '[]'),
  };
}

export const GuestCloudStatus: React.FC = () => {
  const [status, setStatus] = useState('Sẵn sàng đo · Lưu dữ liệu trên thiết bị');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (IS_DEMO_MODE) {
      setStatus('Chế độ demo · Dữ liệu được lưu trên thiết bị này');
      return;
    }
    let active = true;
    let running = false;
    let lastSaved = '';
    const controller = new AbortController();
    const sync = async () => {
      if (running || !active) return;
      running = true;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const request = new AbortController();
      const abort = () => request.abort();
      controller.signal.addEventListener('abort', abort);
      try {
        const uid = await ensureFirebaseIdentity();
        if (!active) return;
        const snapshot = readGardenSnapshot();
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastSaved) return;
        timeout = setTimeout(() => request.abort(), 10000);
        const url = await authenticatedDatabaseUrl(`${measurementDatabaseUrl}/users/${encodeURIComponent(uid)}/garden_backup.json`);
        if (!active) return;
        const response = await fetch(url, { method: 'PUT', signal: request.signal,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...snapshot, savedAt: Date.now() }) });
        if (!response.ok) throw new Error(`Firebase HTTP ${response.status}`);
        lastSaved = serialized;
        if (active) setStatus(`Đã đồng bộ ${snapshot.gardens.length} vườn, ${snapshot.trees.length} cây · ${new Date().toLocaleTimeString('vi-VN')}`);
        void retryPendingTreeMeasurements();
      } catch (error) {
        if (active) setStatus('Dữ liệu trên thiết bị · Bản sao trực tuyến đang chờ đồng bộ');
      } finally {
        if (timeout) clearTimeout(timeout);
        controller.signal.removeEventListener('abort', abort);
        running = false;
      }
    };
    void sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('online', sync);
    window.addEventListener('cdguard:gardens-changed', sync);
    window.addEventListener('cdguard:trees-changed', sync);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener('online', sync); window.removeEventListener('cdguard:gardens-changed', sync); window.removeEventListener('cdguard:trees-changed', sync); };
  }, [retry]);
  return <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-2 text-xs text-emerald-900 flex gap-2 items-center">
    <span role="status" className="flex-1">{status}</span>
    {!IS_DEMO_MODE && <button type="button" onClick={() => setRetry(n => n + 1)} className="font-bold shrink-0 underline">Đồng bộ vườn</button>}
  </div>;
};

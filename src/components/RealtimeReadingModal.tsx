import React, { useEffect, useRef, useState } from 'react';
import { fetchRealtimeReading, RealtimeReading } from '../services/realtimeReading';
import { Garden } from '../types';
import { IS_DEMO_MODE } from '../services/demoMode';

export function RealtimeReadingModal({ onClose }: { onClose: () => void; garden: Garden; initialTreeId?: string }) {
  const [reading, setReading] = useState<RealtimeReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const lastKey = useRef('');

  const refresh = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const latest = await fetchRealtimeReading(controller.signal);
      if (controller.signal.aborted) return;
      setMessage(lastKey.current === latest.key ? 'Chưa có lần đo mới từ máy.' : 'Đã nhận số đo từ máy.');
      lastKey.current = latest.key;
      setReading(latest);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error && e.name !== 'AbortError' && e.name !== 'TypeError'
        ? e.message : 'Chưa nhận được số đo. Kiểm tra kết nối và bấm lại.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };
  useEffect(() => {
    void refresh();
    return () => { request.current?.abort(); request.current = null; };
  }, []);

  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="realtime-title">
    <section className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl text-slate-900">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="realtime-title" className="text-xl font-bold text-emerald-900">Realtime · Số đo từ máy</h2>
        <button onClick={onClose} aria-label="Đóng Realtime" className="p-2 font-bold">✕</button>
      </div>
      <p className="text-sm text-slate-600 mb-4">{IS_DEMO_MODE ? 'Chế độ demo: mỗi lần làm mới tạo một bộ chỉ số mô phỏng mới, không cần máy đo.' : 'Màn này chỉ xem số đo mới nhất từ máy. Để lưu đúng một cây, vào Bản đồ vườn → chọn cây → Bắt đầu đo.'}</p>
      <div aria-live="polite">
        {busy && <p className="text-blue-700 mb-3">Đang lấy số đo…</p>}
        {error && <p className="text-amber-800 mb-3">{error}</p>}
        {!busy && !error && message && <p className="text-emerald-800 mb-3">{message}</p>}
        {reading && <>
          <div className="grid grid-cols-2 gap-3 my-4">
            {[
              ['pH', reading.ph, ''], ['EC', reading.ec, 'µS/cm'],
              ['Độ ẩm', reading.moisture, '%'], ['Nhiệt độ', reading.temp, '°C'],
            ].map(([label, value, unit]) => <div key={label} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="text-2xl font-bold mt-1">{value} <span className="text-sm">{unit}</span></p>
            </div>)}
          </div>
          <p className="text-sm">Máy: {reading.deviceId}</p>
          <p className="text-sm font-semibold">Thời gian nhận: {new Date(reading.ts).toLocaleString('vi-VN')}</p>
          {Date.now() - reading.ts > 5 * 60000 && <p className="text-slate-600 text-sm mt-2">Đang xem lần đo trước. Đo lại để cập nhật cây.</p>}
        </>}
      </div>
      <button disabled={busy} onClick={() => void refresh()} className="w-full mt-5 rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-50">{busy ? 'Đang lấy số đo…' : IS_DEMO_MODE ? 'Tạo số đo demo mới' : 'Làm mới số đo hiển thị'}</button>
    </section>
  </div>;
}

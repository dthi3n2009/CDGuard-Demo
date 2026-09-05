import React, { useState, useEffect } from 'react';
import { Garden, SyncStatusState } from '../types';
import { isReadingFresh } from '../services/deviceStatus';
import { fetchLatestFirebaseReading, sendSensorDataToFirebase } from '../services/firebaseService';
import { SPOT_LOCATIONS } from '../services/demoDataService';
import {
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Database,
  Radio,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Send,
  Sparkles,
  TreePine,
  Activity,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DeviceTabProps {
  garden: Garden;
  syncStatus: SyncStatusState;
  onUpdateGarden: (updated: Garden) => void;
  onOpenLiveSurvey?: () => void;
}

export const DeviceTab: React.FC<DeviceTabProps> = ({
  garden,
  syncStatus,
  onUpdateGarden,
  onOpenLiveSurvey
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ status: 'success' | 'station_offline' | 'network_error' | null; message: string }>({
    status: null,
    message: ''
  });
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [testTreeLocation, setTestTreeLocation] = useState<string>(SPOT_LOCATIONS[0]);
  const [testPh, setTestPh] = useState<number>(garden.ph);
  const [testEc, setTestEc] = useState<number>(garden.ec);
  const [testMoisture, setTestMoisture] = useState<number>(garden.moisture);
  const [testTemp, setTestTemp] = useState<number>(garden.temperature);
  const [sendingToFirebase, setSendingToFirebase] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const showTestTools = false;

  // Time calculations
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const lastTs = garden.hasVerifiedReading ? garden.lastUpdated : 0;
  const minutesSinceLastReading = Math.floor((now - lastTs) / 60000);
  const isDataFresh = !!garden.hasVerifiedReading && garden.online && isReadingFresh(lastTs, now);

  const formattedLastTime = new Date(lastTs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(lastTs).toLocaleDateString('vi-VN');

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult({ status: null, message: '' });
    try {
      const res = await fetchLatestFirebaseReading();
      if (res.success && res.data && res.data.deviceId === garden.deviceId) {
        const dataTs = res.data.ts;
        const fresh = res.online;

        onUpdateGarden({
          ...garden,
          ph: res.data.ph,
          ec: res.data.ec,
          moisture: res.data.moisture,
          temperature: res.data.temp,
          online: fresh,
          hasVerifiedReading: true,
          lastUpdated: dataTs
        });

        if (fresh) {
          setSyncResult({
            status: 'success',
            message: `Đã nhận số đo trực tiếp từ ESP32 (${res.data.deviceId}): pH ${res.data.ph}, EC ${res.data.ec} dS/m, Ẩm ${res.data.moisture}%, ${res.data.temp}°C!`
          });
        } else {
          setSyncResult({
            status: 'success',
            message: 'Đã đọc bản ghi cũ. Chưa có số đo mới, chưa xác nhận trạm đang kết nối.'
          });
        }
      } else {
        onUpdateGarden({ ...garden, online: false });
        setSyncResult({
          status: 'network_error',
          message: res.success ? 'Firebase có dữ liệu nhưng không phải mã trạm của vườn này.' : 'Chưa lấy được số đo hợp lệ. Kiểm tra mã trạm và mạng.'
        });
      }
    } catch (e: any) {
      setSyncResult({
        status: 'network_error',
        message: 'Điện thoại không truy cập được máy chủ.'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSendTestDataToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingToFirebase(true);
    setSendResult(null);
    try {
      const res = await sendSensorDataToFirebase({
        deviceId: garden.deviceId || 'esp32-01', treeName: testTreeLocation, locationName: testTreeLocation,
        ph: testPh, ec: testEc, moisture: testMoisture, temp: testTemp, ts: Date.now()
      });
      setSendResult(res);
    } finally {
      setSendingToFirebase(false);
    }
  };

  const applyPreset = (preset: 'safe' | 'caution' | 'warning') => {
    const values = preset === 'safe' ? [6.45, 0.22, 72, 28] : preset === 'caution' ? [5.6, 1.8, 78, 29.5] : [4.8, 2.8, 85, 32];
    setTestPh(values[0]); setTestEc(values[1]); setTestMoisture(values[2]); setTestTemp(values[3]);
  };

  return (
    <div className="space-y-4 pb-16 max-w-4xl mx-auto w-full overflow-x-hidden">
      
      {/* 🚀 LIVE FIELD SURVEY BANNER (App ↔ Phần cứng ESP32 ↔ Vòng Lặp Tự Động) */}
      {onOpenLiveSurvey && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#1a472a] to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-emerald-500/50 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-md shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Chế Độ Đo Hiện Trường Tự Động</span>
                  <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30">
                    Live Sync Loop
                  </span>
                </h2>
                <p className="text-xs text-emerald-200 font-medium">
                  Đo quanh gốc • App & Firmware tự động lưu và nhảy sang cây mới • Chuyển vườn mượt mà
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenLiveSurvey}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <span>🚀 Bắt Đầu Buổi Đo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-emerald-500/30">
            <div className="p-2 bg-emerald-900/40 rounded-xl border border-emerald-500/20">
              <strong className="text-amber-300 block text-[11px]">1. Vòng lặp vị trí:</strong>
              <span className="text-slate-300 text-[11px]">Cắm que 4 điểm quanh gốc, máy tự lưu mã A-01-1, A-01-2...</span>
            </div>
            <div className="p-2 bg-emerald-900/40 rounded-xl border border-emerald-500/20">
              <strong className="text-amber-300 block text-[11px]">2. Nhảy cây tự động:</strong>
              <span className="text-slate-300 text-[11px]">Chốt gốc xong, firmware tự động reset vị trí 1 và tăng số gốc.</span>
            </div>
            <div className="p-2 bg-emerald-900/40 rounded-xl border border-emerald-500/20">
              <strong className="text-amber-300 block text-[11px]">3. Chuyển vườn mới:</strong>
              <span className="text-slate-300 text-[11px]">Chốt vườn lưu báo cáo, chuyển vườn B làm mới chu trình đo.</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. SEPARATED CLEAR STATUS CARD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 bg-[#2D7D46] text-white rounded-2xl shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-base text-slate-900 truncate">Trạm Cảm Biến Đất</h2>
              <p className="text-xs text-slate-500 font-semibold truncate">Mã trạm: {garden.deviceId || 'Chưa khai báo'}</p>
            </div>
          </div>

        </div>

        {/* 3 DISAMBIGUATED CONNECTIONS */}
        <div className="space-y-2 text-xs sm:text-sm">
          
          {/* Status 1: 4G Station Signal */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Radio className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. Sóng trạm 4G LTE:</span>
            </div>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Chưa có dữ liệu đo chất lượng sóng
            </span>
          </div>

          {/* Status 2: App Server Connection */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. Kết nối Firebase RTDB:</span>
            </div>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {syncStatus === 'updated' ? 'Đã đọc được Firebase' : syncStatus === 'syncing' ? 'Đang kiểm tra…' : 'Chưa kết nối được Firebase'}
            </span>
          </div>

          {/* Status 3: Sensor Data Freshness */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
            isDataFresh ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
          }`}>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              {isDataFresh ? <Wifi className="w-4 h-4 text-emerald-600 shrink-0" /> : <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>3. Dữ liệu cảm biến đất:</span>
            </div>
            <span className={`font-extrabold px-2.5 py-1 rounded-lg ${
              isDataFresh ? 'text-emerald-800 bg-white' : 'text-amber-900 bg-white'
            }`}>
              {isDataFresh ? 'Có số đo mới từ đúng mã trạm' : lastTs ? `Chưa có số đo mới (${minutesSinceLastReading} phút)` : 'Chưa xác nhận kết nối thiết bị'}
            </span>
          </div>

        </div>

        {/* Specific Last Timestamp */}
        <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center">
          <span>Dữ liệu mới nhất lúc:</span>
          <span className="text-slate-900 font-extrabold">{lastTs ? formattedLastTime : 'Chưa có dữ liệu xác minh'}</span>
        </div>

        {/* Sync Action & Feedback Result */}
        <div className="space-y-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full bg-[#2D7D46] hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all min-h-[48px]"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Đang truy vấn Firebase...' : 'Thử lấy số đo mới từ Firebase'}</span>
          </button>

          {syncResult.status && (
            <div className={`p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
              syncResult.status === 'success'
                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                : syncResult.status === 'station_offline'
                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                : 'bg-red-100 text-red-950 border border-red-300'
            }`}>
              {syncResult.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

      </div>

      {showTestTools && <>
      {/* 2. LIVE DEMO TEST: TRANSMIT DATA TO FIREBASE */}
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-700/40 space-y-3.5">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>Demo Test: Gửi Dữ Liệu Lên Firebase</span>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black">
                  LIVE DEMO
                </span>
              </h3>
              <p className="text-xs text-emerald-200/80">
                Thử nghiệm gửi tức thì số đo gần đất của 5 cây sầu riêng lên Firebase RTDB
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-300">Chọn nhanh tình huống đo:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('safe')}
              className="py-1.5 px-2 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 border border-emerald-600/50 rounded-xl text-xs font-bold transition-all text-center"
            >
              🟢 Đất Sạch (pH 6.45)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('caution')}
              className="py-1.5 px-2 bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-600/50 rounded-xl text-xs font-bold transition-all text-center"
            >
              🟡 Hơi Nhiễm (pH 5.6)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('warning')}
              className="py-1.5 px-2 bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-600/50 rounded-xl text-xs font-bold transition-all text-center"
            >
              🔴 Chua/Mặn (pH 4.8)
            </button>
          </div>
        </div>

        <form onSubmit={handleSendTestDataToFirebase} className="space-y-3 pt-1">
          {/* Select Tree Location */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
              <TreePine className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vị trí cây đang lấy mẫu:</span>
            </label>
            <select
              value={testTreeLocation}
              onChange={(e) => setTestTreeLocation(e.target.value)}
              className="w-full bg-slate-800 border border-emerald-700/50 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:border-emerald-400"
            >
              {SPOT_LOCATIONS.map((loc) => (
                <option key={loc} value={loc} className="bg-slate-900 text-white">
                  📍 {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 4 Sensor Value Sliders/Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* pH */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="block text-[11px] text-slate-300 font-bold mb-1">pH Đất:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="3.5"
                  max="8.5"
                  required
                  value={testPh}
                  onChange={(e) => setTestPh(parseFloat(e.target.value) || 6.0)}
                  className="w-full bg-slate-900 text-emerald-400 font-black font-mono px-2 py-1 rounded-lg border border-slate-600 text-xs"
                />
                <span className="text-[10px] text-slate-400">pH</span>
              </div>
            </div>

            {/* EC */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="block text-[11px] text-slate-300 font-bold mb-1">Độ Mặn (EC):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5.0"
                  required
                  value={testEc}
                  onChange={(e) => setTestEc(parseFloat(e.target.value) || 0.2)}
                  className="w-full bg-slate-900 text-amber-400 font-black font-mono px-2 py-1 rounded-lg border border-slate-600 text-xs"
                />
                <span className="text-[10px] text-slate-400">dS/m</span>
              </div>
            </div>

            {/* Moisture */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="block text-[11px] text-slate-300 font-bold mb-1">Độ Ẩm Đất:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min="20"
                  max="100"
                  required
                  value={testMoisture}
                  onChange={(e) => setTestMoisture(parseInt(e.target.value) || 70)}
                  className="w-full bg-slate-900 text-blue-400 font-black font-mono px-2 py-1 rounded-lg border border-slate-600 text-xs"
                />
                <span className="text-[10px] text-slate-400">%</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="block text-[11px] text-slate-300 font-bold mb-1">Nhiệt Độ:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="15"
                  max="45"
                  required
                  value={testTemp}
                  onChange={(e) => setTestTemp(parseFloat(e.target.value) || 28)}
                  className="w-full bg-slate-900 text-purple-400 font-black font-mono px-2 py-1 rounded-lg border border-slate-600 text-xs"
                />
                <span className="text-[10px] text-slate-400">°C</span>
              </div>
            </div>
          </div>

          {/* Submit Test Button */}
          <button
            type="submit"
            disabled={sendingToFirebase}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 min-h-[48px]"
          >
            {sendingToFirebase ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                <span>Đang gửi số đo lên Firebase RTDB...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5 text-slate-950" />
                <span>🚀 Bấm Gửi Dữ Liệu Lên Firebase Ngay</span>
              </>
            )}
          </button>

          {/* Send Result Banner */}
          {sendResult && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              sendResult.success 
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
            }`}>
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{sendResult.message}</span>
            </div>
          )}
        </form>
      </div>

      </>}

      {/* 3. SIMPLIFIED FARMER DEVICE DIAGRAM */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Layers className="w-5 h-5 text-[#2D7D46]" />
          <h3 className="font-black text-sm sm:text-base text-slate-900">
            Sơ đồ nguyên lý kết nối trạm
          </h3>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Sơ đồ mô tả hệ thống, không phải xác nhận thiết bị đang kết nối:
        </p>

        {/* 4-Step Diagram */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-center">
          
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
            <span className="text-lg block">🌳</span>
            <span className="font-extrabold text-slate-900 block">1. Cảm biến đất</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full inline-block border border-emerald-200">
              Các vị trí bạn khai báo
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
            <span className="text-lg block">📦</span>
            <span className="font-extrabold text-slate-900 block">2. Bộ điều khiển</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full inline-block border border-emerald-200">
              ESP32 Dual Core
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
            <span className="text-lg block">📡</span>
            <span className="font-extrabold text-slate-900 block">3. Mạng 4G LTE</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full inline-block border border-emerald-200">
              Chưa có dữ liệu sóng
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
            <span className="text-lg block">🔥</span>
            <span className="font-extrabold text-slate-900 block">4. Firebase RTDB</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full inline-block border border-emerald-200">
              {syncStatus === 'updated' ? 'Đã đọc máy chủ' : 'Chưa xác nhận kết nối'}
            </span>
          </div>

        </div>

        {/* Technical details toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-slate-600" />
              <span>Xem thông tin kỹ thuật Firebase & Trạm</span>
            </div>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-2 p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-2 font-mono">
              <p>• Vi điều khiển: ESP32 MCU (32-bit Dual Core)</p>
              <p>• Mô-đun truyền thông: A7680C 4G LTE Cat-1</p>
              <p>• Chuẩn giao tiếp cảm biến: RS485 Modbus RTU (Độ sâu 20cm - 30cm)</p>
              <p>• Cơ sở dữ liệu: Firebase Realtime Database (CDGuard RTDB)</p>
              <p>• Endpoint API: https://cdguard-7700a-default-rtdb.asia-southeast1.firebasedatabase.app</p>
              <p>• Nhánh dữ liệu: /data (Lịch sử) & /latest (Bản ghi mới nhất)</p>
              <p>• Chu kỳ quét tự động: 10 giây / lần</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};


import React, { useState } from 'react';
import { Garden } from '../types';
import { calculateCRS } from '../utils/crsCalculator';
import { runCRSTests } from '../utils/crsCalculator.test';
import { sendSensorDataToFirebase } from '../services/firebaseService';
import { Wrench, Sliders, Play, RotateCcw, X, Check, CheckCircle2, AlertTriangle, Send, RefreshCw } from 'lucide-react';

interface DevModePanelProps {
  garden: Garden;
  onUpdateGarden: (updated: Garden) => void;
  onResetDemo: () => void;
  onClose: () => void;
}

export const DevModePanel: React.FC<DevModePanelProps> = ({
  garden,
  onUpdateGarden,
  onResetDemo,
  onClose
}) => {
  const [ph, setPh] = useState(garden.ph);
  const [ec, setEc] = useState(garden.ec);
  const [moisture, setMoisture] = useState(garden.moisture);
  const [temp, setTemp] = useState(garden.temperature);
  const [battery, setBattery] = useState(garden.battery);
  const [online, setOnline] = useState(garden.online);
  const [autoFluctuate, setAutoFluctuate] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [sendingFirebase, setSendingFirebase] = useState(false);
  const [fbMessage, setFbMessage] = useState<string | null>(null);

  const calculatedCrs = calculateCRS(ph, ec, moisture, temp);

  const applyChanges = (
    newPh: number,
    newEc: number,
    newMoisture: number,
    newTemp: number,
    newOnline: boolean = online,
    newBattery: number = battery
  ) => {
    setPh(newPh);
    setEc(newEc);
    setMoisture(newMoisture);
    setTemp(newTemp);
    setOnline(newOnline);
    setBattery(newBattery);

    onUpdateGarden({
      ...garden,
      ph: newPh,
      ec: newEc,
      moisture: newMoisture,
      temperature: newTemp,
      battery: newBattery,
      online: newOnline,
      lastUpdated: Date.now()
    });
  };

  const handlePushToFirebase = async () => {
    setSendingFirebase(true);
    setFbMessage(null);
    try {
      const res = await sendSensorDataToFirebase({
        deviceId: garden.deviceId || 'esp32-01',
        treeName: 'Cây 1 (Mô phỏng DevMode)',
        ph,
        ec,
        moisture,
        temp,
        ts: Date.now()
      });
      applyChanges(ph, ec, moisture, temp, true, battery);
      setFbMessage(res.message);
    } catch (e: any) {
      applyChanges(ph, ec, moisture, temp, true, battery);
      setFbMessage('Đã cập nhật dữ liệu cục bộ thành công.');
    } finally {
      setSendingFirebase(false);
    }
  };

  const setPreset = (type: 'safe' | 'caution' | 'warning' | 'high_risk') => {
    switch (type) {
      case 'safe':
        applyChanges(6.2, 1.2, 68, 28);
        break;
      case 'caution':
        applyChanges(5.7, 2.2, 77, 30);
        break;
      case 'warning':
        applyChanges(5.1, 2.7, 82, 31);
        break;
      case 'high_risk':
        applyChanges(4.2, 3.6, 88, 34);
        break;
    }
  };

  const handleRunUnitTests = () => {
    const res = runCRSTests();
    setTestResults(res);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Dev Mode – Bảng điều khiển thử nghiệm</h3>
              <p className="text-[10px] text-slate-400">Tự do giả lập các chỉ số đất & kiểm tra phản ứng CRS ngay lập tức</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-800">
          
          {/* Quick Presets */}
          <div>
            <label className="font-bold text-slate-700 block mb-2">Tạo tình huống nhanh (Presets):</label>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5">
              <button
                onClick={() => setPreset('safe')}
                className="px-2 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] border border-emerald-300"
              >
                🟢 An toàn
              </button>
              <button
                onClick={() => setPreset('caution')}
                className="px-2 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] border border-amber-300"
              >
                🟡 Cần chú ý
              </button>
              <button
                onClick={() => setPreset('warning')}
                className="px-2 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-[11px] border border-orange-300"
              >
                🟠 Cảnh báo
              </button>
              <button
                onClick={() => setPreset('high_risk')}
                className="px-2 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 font-bold text-[11px] border border-red-300"
              >
                🔴 Nguy cơ cao
              </button>
            </div>
          </div>

          {/* Calculated Score Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">CRS Tính toán trực tiếp:</p>
                <p className="text-xl font-extrabold text-slate-900">{calculatedCrs} / 100</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => applyChanges(ph, ec, moisture, temp, online, battery)}
                  className="bg-[#2D7D46] hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Cập nhật Vườn</span>
                </button>
                <button
                  onClick={handlePushToFirebase}
                  disabled={sendingFirebase}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs text-xs"
                >
                  {sendingFirebase ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Gửi lên Firebase</span>
                </button>
              </div>
            </div>

            {fbMessage && (
              <div className="p-2 bg-emerald-100 text-emerald-950 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{fbMessage}</span>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* pH Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>pH đất: <strong className="text-emerald-700">{ph.toFixed(1)}</strong></span>
                <span className="text-slate-400 font-normal">3.5 - 8.0</span>
              </div>
              <input
                type="range"
                min="3.5"
                max="8.0"
                step="0.1"
                value={ph}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPh(v);
                  applyChanges(v, ec, moisture, temp);
                }}
                className="w-full accent-[#2D7D46]"
              />
            </div>

            {/* EC Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>EC (dS/m): <strong className="text-emerald-700">{ec.toFixed(2)}</strong> ({Math.round(ec * 1000)} µS/cm)</span>
                <span className="text-slate-400 font-normal">0 - 5.0</span>
              </div>
              <input
                type="range"
                min="0"
                max="5.0"
                step="0.05"
                value={ec}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setEc(v);
                  applyChanges(ph, v, moisture, temp);
                }}
                className="w-full accent-[#2D7D46]"
              />
            </div>

            {/* Moisture Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>Độ ẩm đất (%): <strong className="text-emerald-700">{moisture.toFixed(1)}%</strong></span>
                <span className="text-slate-400 font-normal">20% - 100%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="1"
                value={moisture}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setMoisture(v);
                  applyChanges(ph, ec, v, temp);
                }}
                className="w-full accent-[#2D7D46]"
              />
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>Nhiệt độ đất (°C): <strong className="text-emerald-700">{temp.toFixed(1)}°C</strong></span>
                <span className="text-slate-400 font-normal">15°C - 45°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                step="0.5"
                value={temp}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setTemp(v);
                  applyChanges(ph, ec, moisture, v);
                }}
                className="w-full accent-[#2D7D46]"
              />
            </div>

            {/* Battery Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>Pin thiết bị (%): <strong className="text-emerald-700">{battery}%</strong></span>
                <span className="text-slate-400 font-normal">0% - 100%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={battery}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setBattery(v);
                  applyChanges(ph, ec, moisture, temp, online, v);
                }}
                className="w-full accent-[#2D7D46]"
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 flex flex-wrap gap-4 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={online}
                  onChange={(e) => {
                    setOnline(e.target.checked);
                    applyChanges(ph, ec, moisture, temp, e.target.checked, battery);
                  }}
                  className="rounded text-[#2D7D46] focus:ring-[#2D7D46] w-4 h-4"
                />
                <span>Trạng thái Trực tuyến (Online)</span>
              </label>
            </div>
          </div>

          {/* Unit Testing Runner */}
          <div className="bg-slate-900 text-slate-100 p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Play className="w-4 h-4 fill-amber-400" />
                Kiểm thử tự động Công thức CRS (Unit Tests)
              </span>
              <button
                onClick={handleRunUnitTests}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-2.5 py-1 rounded-lg text-[11px]"
              >
                Chạy 6 Unit Tests
              </button>
            </div>

            {testResults && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2 rounded-lg text-[11px] font-mono">
                {testResults.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-300 truncate pr-2">{t.test}</span>
                    {t.passed ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> PASS ({t.actual})
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3" /> FAIL (got {t.actual}, exp {t.expected})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                onResetDemo();
                onClose();
              }}
              className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Đặt lại Dữ liệu Demo Ban đầu</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

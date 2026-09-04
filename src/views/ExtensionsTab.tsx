import React, { useState } from 'react';
import { Garden, FertilizerLogEntry } from '../types';
import {
  FileText,
  Package,
  Scan,
  Plus,
  Calendar,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Upload,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface ExtensionsTabProps {
  garden: Garden;
  gardens: Garden[];
  onSelectGarden: (gardenId: string) => void;
}

const INITIAL_LOGS: FertilizerLogEntry[] = [
  {
    id: 'f-1',
    gardenId: 'g-1',
    date: '2026-08-08',
    type: 'fertilizer',
    productName: 'Phân hữu cơ nở bón lót Humic + Vôi Dolomite',
    amount: '15 kg/gốc',
    targetArea: 'Xung quanh gốc sầu riêng bán kính 1.5m',
    notes: 'Bón sau đợt mưa lớn giúp nâng độ pH đất từ 5.2 lên 6.4'
  },
  {
    id: 'f-2',
    gardenId: 'g-1',
    date: '2026-08-04',
    type: 'pesticide',
    productName: 'Thuốc sinh học phòng nấm Phytophthora (Ridomil Gold)',
    amount: '500 ml / 200 lít nước',
    targetArea: 'Phun sương đều thân và quét gốc sầu riêng',
    notes: 'Phòng ngừa thối gốc xì mủ trước mùa mưa triều cường'
  }
];

const INITIAL_INVENTORY = [
  { id: 'i-1', name: 'Vôi Nông Nghiệp Dolomite', category: 'Cải tạo đất', quantity: 250, unit: 'kg' },
  { id: 'i-2', name: 'Phân Hữu Cơ Humic Mỹ', category: 'Phân bón', quantity: 80, unit: 'kg' },
  { id: 'i-3', name: 'Phân NPK 15-15-15', category: 'Phân bón', quantity: 120, unit: 'kg' },
  { id: 'i-4', name: 'Thuốc sinh học Ridomil Gold', category: 'Thuốc BVTV', quantity: 12, unit: 'chai' },
];

export const ExtensionsTab: React.FC<ExtensionsTabProps> = ({
  garden,
  gardens,
  onSelectGarden
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'inventory' | 'disease'>('logs');
  
  // Fertilizer Logs State
  const [logs, setLogs] = useState<FertilizerLogEntry[]>(INITIAL_LOGS);
  const [showAddLogModal, setShowAddLogModal] = useState<boolean>(false);
  const [newLogType, setNewLogType] = useState<'fertilizer' | 'pesticide'>('fertilizer');
  const [newLogProduct, setNewLogProduct] = useState<string>('');
  const [newLogAmount, setNewLogAmount] = useState<string>('');
  const [newLogArea, setNewLogArea] = useState<string>('');
  const [newLogNotes, setNewLogNotes] = useState<string>('');

  // Inventory State
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [newInvName, setNewInvName] = useState('');
  const [newInvCat, setNewInvCat] = useState('Phân bón');
  const [newInvQty, setNewInvQty] = useState('');
  const [newInvUnit, setNewInvUnit] = useState('kg');
  const [showAddInvModal, setShowAddInvModal] = useState(false);

  // Disease Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    diseaseName: string;
    confidence: number;
    severity: string;
    treatment: string;
  } | null>(null);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogProduct.trim()) return;

    const entry: FertilizerLogEntry = {
      id: 'log-' + Date.now(),
      gardenId: garden.id,
      date: new Date().toISOString().split('T')[0],
      type: newLogType,
      productName: newLogProduct,
      amount: newLogAmount || 'Theo liều lượng khuyến cáo',
      targetArea: newLogArea || 'Toàn bộ tán cây',
      notes: newLogNotes || 'Không có ghi chú'
    };

    setLogs([entry, ...logs]);
    setNewLogProduct('');
    setNewLogAmount('');
    setNewLogArea('');
    setNewLogNotes('');
    setShowAddLogModal(false);
  };

  const handleDeleteLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim()) return;
    setInventory([
      ...inventory,
      {
        id: 'inv-' + Date.now(),
        name: newInvName,
        category: newInvCat,
        quantity: Number(newInvQty) || 1,
        unit: newInvUnit
      }
    ]);
    setNewInvName('');
    setNewInvQty('');
    setShowAddInvModal(false);
  };

  const handleSimulateScan = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult({
        diseaseName: 'Bệnh xì mủ thối gốc (Phytophthora palmivora)',
        confidence: 96,
        severity: 'Nhẹ - Cần xử lý sớm',
        treatment: 'Cạo sạch vết xì mủ trên vỏ gốc, sấy khô nhẹ và quét dung dịch Metalaxyl / Ridomil Gold đậm đặc. Kết hợp bón vôi Dolomite cải tạo pH đất quanh gốc.'
      });
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto w-full overflow-x-hidden">
      
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-[#2D7D46] rounded-xl shrink-0 font-bold">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
              Tính Năng Mở Rộng Quản Lý Nông Nghiệp
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Nhật ký bón phân • Quản lý vật tư kho • Nhận diện bệnh hại cây trồng bằng AI
            </p>
          </div>
        </div>

        {/* Garden Switcher */}
        <select
          value={garden.id}
          onChange={(e) => onSelectGarden(e.target.value)}
          className="bg-emerald-50 text-[#2D7D46] border border-emerald-200 font-extrabold rounded-xl px-3 py-1.5 text-xs focus:outline-none"
        >
          {gardens.map((g) => (
            <option key={g.id} value={g.id}>
              🏡 {g.name} ({g.crop})
            </option>
          ))}
        </select>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all min-h-[40px] ${
            activeSubTab === 'logs'
              ? 'bg-[#2D7D46] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Nhật Ký Phân / Thuốc</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all min-h-[40px] ${
            activeSubTab === 'inventory'
              ? 'bg-[#2D7D46] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Quản Lý Vật Tư</span>
        </button>

        <button
          onClick={() => setActiveSubTab('disease')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all min-h-[40px] ${
            activeSubTab === 'disease'
              ? 'bg-[#2D7D46] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Chẩn Đoán Bệnh AI</span>
        </button>
      </div>

      {/* SUB-TAB 1: FERTILIZER & PESTICIDE LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>📋 Lịch Sử Bón Phân & Xịt Thuốc BVTV ({garden.name}):</span>
            </h3>
            <button
              onClick={() => setShowAddLogModal(true)}
              className="px-3.5 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi Nhật Ký Mới</span>
            </button>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      log.type === 'fertilizer'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {log.type === 'fertilizer' ? '🌱 Bón Phân' : '🧪 Thuốc BVTV'}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-slate-500">
                      📅 {log.date}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                    title="Xóa nhật ký này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {log.productName}
                  </h4>
                  <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                    <p>• Liều lượng: <strong>{log.amount}</strong></p>
                    <p>• Vị trí áp dụng: <strong>{log.targetArea}</strong></p>
                    <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                      " {log.notes} "
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVENTORY MANAGEMENT */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              📦 Kho Vật Tư Nông Nghiệp & Phân Bón:
            </h3>
            <button
              onClick={() => setShowAddInvModal(true)}
              className="px-3.5 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập Kho Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inventory.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {item.category}
                  </span>
                  <span className="text-xs font-black text-[#2D7D46]">
                    Còn tồn kho: {item.quantity} {item.unit}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI PLANT DISEASE DIAGNOSIS */}
      {activeSubTab === 'disease' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl font-bold">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Chẩn Đoán Bệnh Cây Trồng Qua HÌnh Ảnh Camera
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Chụp lá, vết xì mủ thân cây sầu riêng để AI tự động phát hiện bệnh Phytophthora, thán thư, cháy lá
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50">
            <div className="w-12 h-12 bg-emerald-100 text-[#2D7D46] rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-xs sm:text-sm">
                Tải lên ảnh chụp lá / vỏ thân cây sầu riêng bị bệnh
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hỗ trợ định dạng JPG, PNG • Tối đa 10MB
              </p>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="px-5 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {scanning ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  AI đang phân tích ảnh lá cây...
                </span>
              ) : (
                '📷 Chọn Ảnh / Chụp Ảnh Phân Tích Bệnh'
              )}
            </button>
          </div>

          {/* Result view */}
          {scanResult && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <span className="font-extrabold text-xs text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  KẾT QUẢ CHẨN ĐOÁN AI:
                </span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-black rounded-lg text-xs">
                  Độ chính xác {scanResult.confidence}%
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {scanResult.diseaseName}
                </h4>
                <p className="text-xs font-bold text-red-700 mt-0.5">
                  Mức độ nguy hại: {scanResult.severity}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 space-y-1 font-medium">
                <strong className="text-[#2D7D46] font-extrabold block">🛠️ Phác đồ điều trị khuyến nghị:</strong>
                <p className="leading-relaxed">{scanResult.treatment}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD LOG MODAL */}
      {showAddLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h4 className="font-extrabold text-slate-900 text-base">
              Ghi Nhật Ký Bón Phân / Xịt Thuốc Mới
            </h4>

            <form onSubmit={handleAddLog} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Loại tác động:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLogType('fertilizer')}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      newLogType === 'fertilizer'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🌱 Bón Phân
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLogType('pesticide')}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      newLogType === 'pesticide'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🧪 Thuốc BVTV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Tên phân bón / thuốc:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phân NPK 15-15-15 + Humic"
                  value={newLogProduct}
                  onChange={(e) => setNewLogProduct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Liều lượng:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 20 kg/gốc"
                    value={newLogAmount}
                    onChange={(e) => setNewLogAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Khu vực:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Vị trí gò cao"
                    value={newLogArea}
                    onChange={(e) => setNewLogArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Ghi chú hiệu quả:</label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận sự thay đổi của cây sau bón..."
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl"
                >
                  Lưu Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {showAddInvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-3">
            <h4 className="font-extrabold text-slate-900 text-base">Nhập Tồn Kho Vật Tư Mới</h4>
            <form onSubmit={handleAddInventory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên vật tư / phân bón:</label>
                <input
                  type="text"
                  required
                  value={newInvName}
                  onChange={(e) => setNewInvName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng:</label>
                  <input
                    type="number"
                    required
                    value={newInvQty}
                    onChange={(e) => setNewInvQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị:</label>
                  <input
                    type="text"
                    value={newInvUnit}
                    onChange={(e) => setNewInvUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D7D46] text-white text-xs font-extrabold rounded-xl"
                >
                  Thêm Vào Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

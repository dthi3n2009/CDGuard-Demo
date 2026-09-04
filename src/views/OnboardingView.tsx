import React, { useState } from 'react';
import { Garden } from '../types';
import { fetchLatestFirebaseReading } from '../services/firebaseService';
import { roomStorageService, TreeLocation } from '../services/roomStorageService';
import { MapPin, Sprout, Cpu, ArrowRight, ArrowLeft, CheckCircle2, Wifi, Sparkles, Loader2, Ruler, Calendar, Plus, Trash2, TreeDeciduous } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: (newGarden: Garden) => void;
  onSkipToDemo: () => void;
}

const PROVINCE_SUGGESTIONS = [
  'Tiền Giang',
  'Bến Tre',
  'Vĩnh Long',
  'Đồng Tháp',
  'Cần Thơ',
  'Sóc Trăng'
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onComplete,
  onSkipToDemo
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [province, setProvince] = useState('Tiền Giang');
  const [district, setDistrict] = useState('Cai Lậy');
  const [name, setName] = useState('Vườn Sầu Riêng Mới');
  const [shape, setShape] = useState<'rectangle' | 'square'>('rectangle');
  const [length, setLength] = useState<number>(70);
  const [width, setWidth] = useState<number>(50);
  const [area, setArea] = useState<number>(3.5);

  const [soilType, setSoilType] = useState('đất phù sa');
  const [crop, setCrop] = useState('sầu riêng Ri6');
  const [age, setAge] = useState<number>(12);
  const [waterSource, setWaterSource] = useState('Sông Tiền');
  const [fertilizerType, setFertilizerType] = useState('Hữu cơ vi sinh & NPK');

  // Initial trees in the garden
  const [trees, setTrees] = useState<Array<{ name: string; variety: string; age: number }>>([
    { name: 'Cây Sầu Riêng #1', variety: 'Sầu riêng Ri6', age: 12 },
    { name: 'Cây Sầu Riêng #2', variety: 'Sầu riêng Ri6', age: 12 },
    { name: 'Cây Sầu Riêng #3', variety: 'Sầu riêng Ri6', age: 12 }
  ]);

  const [deviceId, setDeviceId] = useState('esp32-01');
  const [testingDevice, setTestingDevice] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Calculate area from dimensions
  const handleDimensionChange = (newLen: number, newWid: number, newShape: 'rectangle' | 'square') => {
    setShape(newShape);
    setLength(newLen);
    const effectiveWidth = newShape === 'square' ? newLen : newWid;
    setWidth(effectiveWidth);
    const m2 = newLen * effectiveWidth;
    setArea(parseFloat((m2 / 1000).toFixed(1)));
  };

  const handleAddTree = () => {
    const nextIdx = trees.length + 1;
    setTrees(prev => [
      ...prev,
      {
        name: `Cây Sầu Riêng #${nextIdx}`,
        variety: crop.includes('Monthong') ? 'Sầu riêng Monthong' : 'Sầu riêng Ri6',
        age
      }
    ]);
  };

  const handleRemoveTree = (index: number) => {
    setTrees(prev => prev.filter((_, i) => i !== index));
  };

  const handleTestConnection = async () => {
    setTestingDevice(true);
    setTestResult(null);
    try {
      const res = await fetchLatestFirebaseReading();
      if (res.success && res.data) {
        setTestResult({
          success: true,
          message: `Kết nối thành công với trạm ${res.data.deviceId}! Nhận tín hiệu cảm biến (pH ${res.data.ph}, EC ${res.data.ec} dS/m).`
        });
      } else {
        setTestResult({
          success: false,
          message: res.errorMsg || 'Không kết nối được Firebase. Bạn có thể bấm tiếp tục để dùng dữ liệu demo!'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Lỗi kiểm tra kết nối. Sử dụng chế độ dữ liệu demo.'
      });
    } finally {
      setTestingDevice(false);
    }
  };

  const handleFinish = () => {
    const newGardenId = 'garden-' + Date.now();
    const garden: Garden = {
      id: newGardenId,
      deviceId,
      name,
      province,
      district,
      shape,
      length,
      width: shape === 'square' ? length : width,
      area,
      soilType,
      crop,
      age,
      waterSource,
      fertilizerType,
      ph: 6.2,
      ec: 0.25,
      moisture: 70,
      temperature: 28.5,
      battery: 90,
      online: true,
      lastUpdated: Date.now()
    };

    // Save initial trees into room storage
    const createdTrees: TreeLocation[] = trees.map((t, idx) => ({
      id: `tree-${newGardenId}-${idx + 1}`,
      gardenId: newGardenId,
      spotNumber: idx + 1,
      row: Math.floor(idx / 3) + 1,
      col: (idx % 3) + 1,
      name: t.name,
      variety: t.variety,
      treeAge: t.age,
      height: 7.5,
      canopyWidth: 6.0,
      notes: 'Cây được tạo khi khai báo vườn'
    }));

    if (createdTrees.length > 0) {
      const existing = roomStorageService.getTreeLocations();
      roomStorageService.saveTreeLocations([...existing, ...createdTrees]);
    }

    onComplete(garden);
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col justify-between p-4 sm:p-6 text-[#1F2D24]">
      <div className="max-w-md mx-auto w-full my-auto bg-white rounded-3xl shadow-xl border border-[#E3E9E5] p-6 space-y-6">
        
        {/* Progress Stepper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7D72]">
            <span>THIẾT LẬP VƯỜN SẦU RIÊNG</span>
            <span>Bước {step} / 3</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className={`h-2 rounded-full transition-all ${step >= 1 ? 'bg-[#2D7D46]' : 'bg-slate-200'}`} />
            <div className={`h-2 rounded-full transition-all ${step >= 2 ? 'bg-[#2D7D46]' : 'bg-slate-200'}`} />
            <div className={`h-2 rounded-full transition-all ${step >= 3 ? 'bg-[#2D7D46]' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* STEP 1: Thông tin vườn */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-[#E3E9E5] pb-3">
              <MapPin className="w-5 h-5 text-[#2D7D46]" />
              <h2 className="font-extrabold text-base text-[#1F2D24]">Bước 1: Thông tin vị trí & quy mô</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Tỉnh / Thành phố:</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {PROVINCE_SUGGESTIONS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvince(p)}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                        province === p
                          ? 'bg-emerald-100 border-[#2D7D46] text-[#2D7D46] font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none"
                  placeholder="Nhập tỉnh/thành"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Huyện / Quận / Thị xã:</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none"
                  placeholder="Ví dụ: Cai Lậy, Châu Thành..."
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Tên vườn sầu riêng:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none font-bold"
                  placeholder="Ví dụ: Vườn Sầu Riêng Bảy Nở"
                />
              </div>

              {/* Garden Shape & Dimensions */}
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80 space-y-2.5">
                <label className="font-bold block text-emerald-950 text-xs">
                  📐 Định dạng & Kích thước khuôn viên vườn:
                </label>
                
                {/* Shape Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange(length, width, 'rectangle')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      shape === 'rectangle'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>▭</span>
                    <span>Hình Chữ Nhật</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDimensionChange(length, length, 'square')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      shape === 'square'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>⏹️</span>
                    <span>Hình Vuông</span>
                  </button>
                </div>

                {/* Dimension inputs */}
                {shape === 'rectangle' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">Chiều dài (mét):</span>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={length}
                        onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 10, width, 'rectangle')}
                        className="w-full p-2 bg-white rounded-xl border border-slate-300 font-extrabold text-sm outline-none focus:ring-2 focus:ring-[#2D7D46]"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">Chiều rộng (mét):</span>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={width}
                        onChange={(e) => handleDimensionChange(length, parseFloat(e.target.value) || 10, 'rectangle')}
                        className="w-full p-2 bg-white rounded-xl border border-slate-300 font-extrabold text-sm outline-none focus:ring-2 focus:ring-[#2D7D46]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">Cạnh hình vuông (mét):</span>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={length}
                      onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 10, parseFloat(e.target.value) || 10, 'square')}
                      className="w-full p-2 bg-white rounded-xl border border-slate-300 font-extrabold text-sm outline-none focus:ring-2 focus:ring-[#2D7D46]"
                    />
                  </div>
                )}

                {/* Computed Area */}
                <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-emerald-200">
                  <span className="text-slate-600 font-medium">Diện tích khuôn viên:</span>
                  <span className="font-extrabold text-[#2D7D46]">
                    {(length * (shape === 'square' ? length : width)).toLocaleString()} m² ({area} công đất)
                  </span>
                </div>
              </div>

              {/* Garden Age */}
              <div>
                <label className="font-bold block mb-1 flex items-center justify-between">
                  <span>Tuổi vườn sầu riêng:</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">{age} năm tuổi</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none font-bold text-sm"
                  placeholder="Số năm tuổi vườn"
                />
              </div>

              {/* Initial Trees Section with PLUS BUTTON (+) */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    <TreeDeciduous className="w-4 h-4 text-[#2D7D46]" />
                    <span>Cây trồng trong vườn ({trees.length} cây):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTree}
                    className="px-2.5 py-1 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Thêm Cây (+)</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {trees.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-emerald-700 font-bold">🌳</span>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...trees];
                            updated[idx].name = e.target.value;
                            setTrees(updated);
                          }}
                          className="font-bold text-slate-800 text-xs bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 outline-none w-36 truncate"
                        />
                        <span className="text-[10px] text-slate-500 font-medium">({t.variety})</span>
                      </div>

                      {trees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTree(idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                          title="Xóa cây"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={onSkipToDemo}
                className="w-1/3 text-xs text-[#6B7D72] font-bold py-3 hover:text-[#1F2D24]"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-2/3 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Đặc điểm canh tác */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-[#E3E9E5] pb-3">
              <Sprout className="w-5 h-5 text-[#2D7D46]" />
              <h2 className="font-extrabold text-base text-[#1F2D24]">Bước 2: Đặc điểm canh tác</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Loại đất chính:</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none bg-white font-medium"
                >
                  <option value="đất phù sa">Đất phù sa bồi ngọt</option>
                  <option value="đất phèn">Đất phèn (nhiễm chua)</option>
                  <option value="đất xám">Đất xám / Đất bạc màu</option>
                  <option value="đất cát pha">Đất cát pha thịt</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Giống cây trồng:</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none bg-white font-medium"
                >
                  <option value="sầu riêng Ri6">Sầu riêng Ri6</option>
                  <option value="sầu riêng Monthong">Sầu riêng Monthong (Dona)</option>
                  <option value="sầu riêng Musang King">Sầu riêng Musang King</option>
                  <option value="xoài cát">Xoài cát Hòa Lộc</option>
                  <option value="lúa">Lúa lỡ canh tác</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Tuổi cây vườn (năm):</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Nguồn nước tưới chính:</label>
                <input
                  type="text"
                  value={waterSource}
                  onChange={(e) => setWaterSource(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none"
                  placeholder="Sông Tiền, Nước mương nội đồng..."
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Loại phân bón thường dùng:</label>
                <input
                  type="text"
                  value={fertilizerType}
                  onChange={(e) => setFertilizerType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none"
                  placeholder="Hữu cơ vi sinh, Axit Humic, NPK..."
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 border border-[#E3E9E5] text-xs text-[#1F2D24] font-bold py-3 rounded-2xl flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Kết nối thiết bị */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-[#E3E9E5] pb-3">
              <Cpu className="w-5 h-5 text-[#2D7D46]" />
              <h2 className="font-extrabold text-base text-[#1F2D24]">Bước 3: Kết nối trạm trắc quan IoT</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Mã trạm thiết bị (Device ID):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#2D7D46] outline-none font-mono font-bold text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingDevice}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2.5 rounded-xl flex items-center gap-1 shrink-0"
                  >
                    {testingDevice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                    <span>Kiểm tra</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#6B7D72] mt-1">
                  Mã trạm mặc định trên Firebase Realtime DB là <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">esp32-01</code>
                </p>
              </div>

              {testResult && (
                <div className={`p-3 rounded-2xl border text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Wifi className="w-4 h-4 text-amber-600" />}
                    {testResult.success ? 'Kết nối trạm IoT OK!' : 'Thông báo kết nối'}
                  </p>
                  <p className="text-[11px]">{testResult.message}</p>
                </div>
              )}

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-[#FFC107]" />
                  Chế độ sẵn sàng Demo
                </p>
                <p className="text-[11px] leading-relaxed">
                  Nếu chưa lắp trạm cảm biến thực tế, hệ thống sẽ tự động khởi tạo bộ dữ liệu giả lập chuẩn vườn sầu riêng ĐBSCL để bạn dùng thử đầy đủ tính năng.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleFinish}
                className="w-full bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-[#FFC107]" />
                <span>Hoàn tất & Khám phá Vườn</span>
              </button>

              <button
                onClick={onSkipToDemo}
                className="w-full text-center text-xs text-[#6B7D72] font-bold py-2 hover:text-[#1F2D24]"
              >
                Bỏ qua & Dùng dữ liệu demo ngay
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

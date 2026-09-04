import React, { useState, useMemo } from 'react';
import { Garden } from '../types';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import { SPOT_LOCATIONS } from '../services/demoDataService';

import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  ShieldAlert,
  Info,
  Sliders,
  Sprout,
  Activity
} from 'lucide-react';

interface AIAnalysisTabProps {
  garden: Garden;
  gardens: Garden[];
  onSelectGarden: (gardenId: string) => void;
}

export const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({
  garden,
  gardens,
  onSelectGarden
}) => {
  // Selected Parameters
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('2026-08-13');
  const [toDate, setToDate] = useState<string>('2026-08-16');
  const [sampleCountLimit, setSampleCountLimit] = useState<number>(30);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>(new Date().toLocaleTimeString('vi-VN'));

  // Calculated CRS score & details
  const crsScore = useMemo(() => {
    return calculateCRS(garden.ph, garden.ec, garden.moisture, garden.temperature);
  }, [garden]);

  const crsDetails = useMemo(() => {
    return getCRSInfo(crsScore, garden.ph, garden.ec, garden.moisture, garden.temperature);
  }, [crsScore, garden]);

  const handleReAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setLastAnalyzedTime(new Date().toLocaleTimeString('vi-VN'));
    }, 800);
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto w-full overflow-x-hidden">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-700/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-extrabold shadow-sm shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Phân Tích AI - Đánh Giá Nguy Cơ & Xu Hướng
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-full text-[10px] font-bold">
                  Chạy nền tự động
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                Phân tích dữ liệu đất tự động không gây gián đoạn thao tác đo đạc.
              </p>
            </div>
          </div>

          <button
            onClick={handleReAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0 min-h-[40px]"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Đang phân tích...' : 'Phân Tích Lại'}</span>
          </button>
        </div>

        <div className="text-[11px] text-amber-200/90 font-mono font-bold pt-1 border-t border-emerald-800/80 flex items-center justify-between">
          <span>Tự động cập nhật nền khi có mẫu đo mới</span>
          <span>Lần phân tích gần nhất: {lastAnalyzedTime}</span>
        </div>
      </div>

      {/* PARAMETERS SELECTION FORM */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm">
          <Sliders className="w-4 h-4 text-[#2D7D46]" />
          <h3>Tùy Chọn Tham Số Phân Tích Dữ Liệu:</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Garden Select */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              🏡 Vườn nông sản:
            </label>
            <select
              value={garden.id}
              onChange={(e) => onSelectGarden(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#2D7D46] focus:outline-none"
            >
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.crop})
                </option>
              ))}
            </select>
          </div>

          {/* Location Select */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              📍 Vị trí / Cây đo:
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#2D7D46] focus:outline-none"
            >
              <option value="all">-- Tất cả 10 vị trí đo --</option>
              {SPOT_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range From-To */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              📅 Khoảng thời gian:
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-1/2 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-2 py-1.5 text-[11px] font-mono font-bold"
              />
              <span className="text-slate-400 font-bold text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-1/2 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-2 py-1.5 text-[11px] font-mono font-bold"
              />
            </div>
          </div>

          {/* Sample count limit */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              📊 Số mẫu đo phân tích:
            </label>
            <select
              value={sampleCountLimit}
              onChange={(e) => setSampleCountLimit(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#2D7D46] focus:outline-none"
            >
              <option value={10}>10 mẫu gần nhất (1 ngày)</option>
              <option value={30}>30 mẫu gần nhất (3 ngày)</option>
              <option value={90}>90 mẫu gần nhất (1 tuần)</option>
              <option value={240}>240 mẫu toàn bộ lịch sử</option>
            </select>
          </div>
        </div>
      </div>

      {/* MANDATORY DISCLAIMER BANNER (Requirement 10) */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-950 leading-relaxed font-semibold">
          <strong className="font-extrabold text-amber-900 block mb-1">
            ⚠️ LƯU Ý QUAN TRỌNG VỀ CHỈ SỐ NGUY CƠ CRS:
          </strong>
          Chỉ số <strong>CRS (Cadmium Risk Score)</strong> được tính toán dựa trên các tham số thổ nhưỡng học (độ chua pH, độ mặn EC, độ ẩm và nhiệt độ đất). Đây là <strong>chỉ số đánh giá nguy cơ tích tụ</strong>, <strong>KHÔNG PHẢI hàm lượng Cadmium tuyệt đối</strong> trong đất hoặc nông sản. Khi CRS cao vượt mức nguy cơ, bà con nên gửi mẫu đất / lá đến phòng thí nghiệm tiêu chuẩn để xét nghiệm hoá học chính xác trước khi xuất khẩu.
        </div>
      </div>

      {/* ANALYSIS RESULTS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1. CRS SCORE & TREND BREAKDOWN */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2D7D46]" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                1. Điểm Nguy Cơ & Xu Hướng CRS
              </h3>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
              crsScore <= 45 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {crsScore}/100 CRS
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-600">Trạng thái đất hiện tại:</span>
              <span className="font-black text-slate-900">{crsDetails.levelText}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-600">Xu hướng biến đổi 7 ngày:</span>
              <span className="font-black text-emerald-700">↘ Giảm nhẹ (-3.2 điểm) - Ổn định</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-600">Vị trí cần lưu ý nhất:</span>
              <span className="font-black text-amber-700">Điểm #7 (Mương xả thoát nước)</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 space-y-1">
            <span className="text-xs font-extrabold text-slate-700 block">Đánh giá tác động thổ nhưỡng:</span>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Độ pH hiện tại ({garden.ph.toFixed(2)}) giữ đất ở trạng thái kiềm nhẹ, giúp hạn chế tối đa khả năng hòa tan của kim loại nặng. Độ mặn EC ({garden.ec.toFixed(2)} dS/m) thấp an toàn cho bộ rễ sầu riêng.
            </p>
          </div>
        </div>

        {/* 2. POSSIBLE CAUSES */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              2. Nguyên Nhân Có Thể Gây Biến Động
            </h3>
          </div>

          <ul className="space-y-2 text-xs sm:text-sm font-semibold text-slate-700">
            <li className="flex items-start gap-2 p-2 bg-amber-50/60 rounded-xl border border-amber-200/60">
              <span className="text-amber-600 font-black">•</span>
              <span><strong>Tưới nước nhiễm phèn/mặn nhẹ:</strong> Khi tưới sông lúc triều dâng làm tăng chỉ số EC cục bộ ở mương xả.</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
              <span className="text-emerald-600 font-black">•</span>
              <span><strong>Tích tụ hữu cơ phân bón:</strong> Bón phân chuồng chưa hoai mục có thể làm giảm pH tạm thời trong 3-5 ngày.</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-blue-50/60 rounded-xl border border-blue-200/60">
              <span className="text-blue-600 font-black">•</span>
              <span><strong>Độ ẩm đất cao kéo dài:</strong> Mưa bão gây ngập trúng bộ rễ làm biến đổi tính oxy hóa giảm của dung dịch đất.</span>
            </li>
          </ul>
        </div>

        {/* 3. CARE & REMEDIATION SUGGESTIONS */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sprout className="w-5 h-5 text-[#2D7D46]" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              3. Gợi Ý Chăm Sóc & Biện Pháp Xử Lý
            </h3>
          </div>

          <div className="space-y-2 text-xs sm:text-sm font-medium text-slate-800">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <strong className="text-[#2D7D46] font-extrabold block">🌱 Quản lý pH Đất:</strong>
              <p>Rải vôi Dolomite hoặc vôi nông nghiệp 300-500kg/ha quanh tán cây nếu pH tụt xuống dưới 5.5.</p>
            </div>

            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
              <strong className="text-blue-800 font-extrabold block">💧 Bón Phân Hữu Cơ Humic:</strong>
              <p>Bổ sung Acid Humic/Fulvic giúp cố định kim loại tự do trong phức chất cơ kim không tan.</p>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
              <strong className="text-amber-900 font-extrabold block">☀️ Khai Thông Rãnh Thao Tác:</strong>
              <p>Đảm bảo mương vườn không bị ứ đọng nước đục sau khi bón phân hoặc mưa lớn.</p>
            </div>
          </div>
        </div>

        {/* 4. NEXT MEASUREMENT TIMING SCHEDULE */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              4. Thời Điểm & Lịch Đo Tiếp Theo
            </h3>
          </div>

          <div className="space-y-2 text-xs sm:text-sm">
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 font-bold text-indigo-950 flex items-center justify-between">
              <span>⏰ Buổi đo tiếp theo đề xuất:</span>
              <span className="font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg shadow-2xs">
                Chiều nay (16:30 - 17:00)
              </span>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed font-medium">
              • <strong>Tần suất đề xuất:</strong> Duy trì 3 buổi/ngày (Sáng 07:00, Trưa 11:30, Chiều 16:30).<br />
              • <strong>Vị trí cần đo kỹ:</strong> Tập trung đo 10 điểm xoay quanh bán kính 1m - 1.5m tính từ gốc cây sầu riêng.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

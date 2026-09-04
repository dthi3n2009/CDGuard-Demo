import React, { useState } from 'react';
import { CRSResult } from '../types';
import { Shield, AlertTriangle, CheckCircle, Info, HelpCircle, X } from 'lucide-react';

interface CRSGaugeProps {
  crsResult: CRSResult;
  lastUpdated?: number;
  ph: number;
  ec: number;
  moisture: number;
  temperature: number;
}

export const CRSGauge: React.FC<CRSGaugeProps> = ({
  crsResult,
  lastUpdated,
  ph,
  ec,
  moisture,
  temperature
}) => {
  const { score, levelText, color, bgLightColor, borderColor } = crsResult;
  const [showExplanation, setShowExplanation] = useState(false);

  // Calculate SVG stroke offset for gauge
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Breakdown calculation for "Vì sao có điểm này?"
  const phPoints = ph < 5.5 ? Math.round((5.5 - ph) * 25) : ph < 6.0 ? Math.round((6.0 - ph) * 8) : 0;
  const ecPoints = ec > 2.5 ? Math.round((ec - 2.5) * 12 + (ph < 5.5 ? 10 : 0)) : ec > 2.0 ? Math.round((ec - 2.0) * 6) : 0;
  const moisturePoints = moisture > 80 ? Math.round((moisture - 80) * 1.2) : moisture > 75 ? Math.round((moisture - 75) * 0.5) : 0;
  const otherPoints = Math.max(0, score - (phPoints + ecPoints + moisturePoints));

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 relative overflow-hidden">
      {/* Background soft tint */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{ backgroundColor: bgLightColor }}
      />

      <div className="flex flex-col items-center justify-center text-center relative z-10">
        <div className="flex items-center gap-1.5 mb-1 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
          <Shield className="w-4 h-4 text-[#2D7D46]" />
          <span>Điểm cảnh báo nguy cơ Cadmium (CRS)</span>
        </div>

        {/* Gauge Ring */}
        <div className="relative my-2 flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
            {/* Background Circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="#EBF0EC"
              strokeWidth="14"
              fill="transparent"
            />
            {/* Value Arc */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={color}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              {score}
            </span>
            <span className="text-xs text-slate-500 font-semibold mt-0.5">thang điểm 100</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className="px-4 py-2 rounded-full font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-xs border my-1"
          style={{ backgroundColor: bgLightColor, color: color, borderColor: borderColor }}
        >
          {score >= 50 ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{score >= 65 ? 'Điều kiện đất làm tăng mạnh nguy cơ Cadmium' : `Mức cảnh báo: ${levelText}`}</span>
        </div>

        {/* Core Farmer Disclaimer */}
        <p className="text-xs text-slate-600 font-medium mt-1 max-w-md">
          CRS là điểm cảnh báo nguy cơ từ điều kiện đất, <strong>không phải hàm lượng Cadmium đo được</strong>.
        </p>

        {/* Explanation Modal Trigger Button */}
        <button
          onClick={() => setShowExplanation(true)}
          className="mt-2.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#2D7D46] border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 min-h-[44px]"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Vì sao có điểm {score}/100 này?</span>
        </button>

        {/* Timestamp */}
        {lastUpdated && (
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            Số đo lúc: {new Date(lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(lastUpdated).toLocaleDateString('vi-VN')})
          </p>
        )}
      </div>

      {/* Explanation Modal Dialog */}
      {showExplanation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#2D7D46]" />
                <h3 className="font-extrabold text-base text-slate-900">Giải thích Điểm CRS ({score}/100)</h3>
              </div>
              <button
                onClick={() => setShowExplanation(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Điểm CRS tăng cao khi các chỉ số môi trường đất bất lợi, khiến rễ sầu riêng dễ hấp thu kim loại nặng Cadmium nếu đất có sẵn mầm mống.
            </p>

            {/* Contribution Breakdown */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Các yếu tố đóng góp điểm nguy cơ:</h4>
              
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-red-950 block">1. Đất bị chua (pH {ph.toFixed(1).replace('.', ',')})</span>
                  <span className="text-[11px] text-red-800">pH càng thấp, Cadmium càng dễ hòa tan</span>
                </div>
                <span className="font-black text-red-700 text-sm shrink-0 ml-2">+{phPoints} điểm</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-950 block">2. Dấu hiệu mặn (EC {ec.toFixed(2).replace('.', ',')} dS/m)</span>
                  <span className="text-[11px] text-amber-800">Muối hòa tan làm tăng tính độc hại</span>
                </div>
                <span className="font-black text-amber-700 text-sm shrink-0 ml-2">+{ecPoints} điểm</span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-950 block">3. Độ ẩm đất cao ({moisture.toFixed(0)}%)</span>
                  <span className="text-[11px] text-blue-800">Đất ngập úng thiếu oxy làm biến đổi đất</span>
                </div>
                <span className="font-black text-blue-700 text-sm shrink-0 ml-2">+{moisturePoints} điểm</span>
              </div>

              {otherPoints > 0 && (
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-purple-950 block">4. Tương tác cộng hưởng (Nhiệt độ)</span>
                    <span className="text-[11px] text-purple-800">Nhiệt độ {temperature.toFixed(0)}°C làm đẩy nhanh phản ứng</span>
                  </div>
                  <span className="font-black text-purple-700 text-sm shrink-0 ml-2">+{otherPoints} điểm</span>
                </div>
              )}
            </div>

            {/* Final Lab Disclaimer Note */}
            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-300 text-xs text-slate-700 leading-relaxed">
              ⚠️ <strong>Lưu ý quan trọng:</strong> Muốn xác định chính xác đất hoặc trái sầu riêng có nhiễm Cadmium hay không, cần lấy mẫu gửi đến phòng thí nghiệm chuyên sâu (sử dụng máy ICP-MS/AAS).
            </div>

            <button
              onClick={() => setShowExplanation(false)}
              className="w-full bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-sm transition-all"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


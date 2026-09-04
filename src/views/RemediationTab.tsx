import React, { useState, useEffect } from 'react';
import { Garden, RemediationTask } from '../types';
import { getDefaultRemediationTasks } from '../services/demoDataService';
import { localStorageService } from '../services/localStorageService';
import { ShieldAlert, CheckSquare, Square, Calculator, RefreshCw, AlertTriangle, Hammer, CheckCircle2 } from 'lucide-react';

interface RemediationTabProps {
  garden: Garden;
}

export const RemediationTab: React.FC<RemediationTabProps> = ({ garden }) => {
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  
  // Lime calculator parameters
  const [areaCong, setAreaCong] = useState<number>(1); // 1 công = 1000m²
  const [soilType, setSoilType] = useState<'clay' | 'loam' | 'sand'>('loam');
  const [limeType, setLimeType] = useState<'caco3' | 'cao' | 'dolomite'>('caco3');

  useEffect(() => {
    const stored = localStorageService.getTasks();
    if (stored && stored.length > 0) {
      setTasks(stored);
    } else {
      const generated = getDefaultRemediationTasks(garden.ph, garden.ec, garden.moisture);
      setTasks(generated);
      localStorageService.saveTasks(generated);
    }
  }, [garden.ph, garden.ec, garden.moisture]);

  const toggleTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay' : undefined
        };
      }
      return t;
    });
    setTasks(updated);
    localStorageService.saveTasks(updated);
  };

  const resetTasksToRecommended = () => {
    const generated = getDefaultRemediationTasks(garden.ph, garden.ec, garden.moisture);
    setTasks(generated);
    localStorageService.saveTasks(generated);
  };

  // Calculate estimated lime dosage
  const calculateLimeKg = () => {
    const targetPh = 6.0;
    const gap = Math.max(0, targetPh - garden.ph);
    if (gap === 0) return 0;

    const soilFactor = soilType === 'clay' ? 1.3 : soilType === 'sand' ? 0.7 : 1.0;
    const limeFactor = limeType === 'cao' ? 0.7 : limeType === 'dolomite' ? 0.9 : 1.0;

    const baseKgPerCong = gap * 150 * soilFactor * limeFactor;
    return Math.round(baseKgPerCong * areaCong);
  };

  const estimatedLimeKg = calculateLimeKg();

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto w-full overflow-x-hidden">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 bg-emerald-100 text-[#2D7D46] rounded-2xl shrink-0">
            <Hammer className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
              Hôm Nay Cần Làm Gì?
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate">
              Lộ trình từng bước xử lý đất dựa trên pH {garden.ph.toFixed(1).replace('.', ',')} & EC {garden.ec.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <button
          onClick={resetTasksToRecommended}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs flex items-center gap-1 shrink-0 active:scale-95 transition-all min-h-[44px]"
          title="Khôi phục việc đề xuất"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Khôi phục đề xuất</span>
        </button>
      </div>

      {/* 2. TODAY'S ACTION TASKS LIST */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#2D7D46]" />
            Danh sách việc ưu tiên ({tasks.filter(t => t.completed).length}/{tasks.length} hoàn thành)
          </h3>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 shadow-xs active:scale-[0.99] ${
                task.completed
                  ? 'bg-emerald-50/70 border-emerald-300 opacity-80'
                  : 'bg-white border-slate-200 hover:border-[#2D7D46]'
              }`}
            >
              {/* Checkbox */}
              <button className="mt-0.5 text-[#2D7D46] shrink-0 min-h-[44px] flex items-center">
                {task.completed ? (
                  <CheckSquare className="w-6 h-6 text-[#2D7D46]" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400" />
                )}
              </button>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-xs">
                    Ưu tiên {idx + 1}
                  </span>
                  <h4 className={`text-sm sm:text-base font-extrabold ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {task.title}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <strong>Lý do:</strong> {task.description}
                </p>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold">
                  🎯 <strong>Cách thực hiện:</strong> {task.impact}
                </div>

                {task.completed && (task as any).completedAt && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã hoàn thành lúc {(task as any).completedAt}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LIME DOSAGE CALCULATOR BASED ON GARDEN PARAMETERS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Calculator className="w-5 h-5 text-[#2D7D46]" />
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
            Công cụ Tính Liều Lượng Vôi Tham Khảo
          </h3>
        </div>

        <p className="text-xs text-slate-600">
          Nhập thông tin vườn sầu riêng để ứng dụng tính ước lượng vôi cần bón để nâng pH đất lên mức an toàn (pH 6,0):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Farm Area */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Diện tích vườn (Số công / 1000m²):</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={areaCong}
              onChange={(e) => setAreaCong(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none"
            />
          </div>

          {/* Soil Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Loại đất vườn:</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none"
            >
              <option value="loam">Đất thịt / Đất phù sa</option>
              <option value="clay">Đất sét (Cần nhiều vôi hơn)</option>
              <option value="sand">Đất cát / Cát pha (Nên chia nhỏ)</option>
            </select>
          </div>

          {/* Lime Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Loại vôi dự định dùng:</label>
            <select
              value={limeType}
              onChange={(e) => setLimeType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none"
            >
              <option value="caco3">Vôi nông nghiệp CaCO3 (An toàn rễ)</option>
              <option value="cao">Vôi nung CaO (Tác dụng nhanh)</option>
              <option value="dolomite">Vôi Dolomite (Bổ sung Magie)</option>
            </select>
          </div>
        </div>

        {/* Calculated Result Box */}
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-emerald-900 font-bold block">Ước tính lượng vôi tham khảo:</span>
            <span className="text-2xl sm:text-3xl font-black text-[#2D7D46]">
              {estimatedLimeKg > 0 ? `~ ${estimatedLimeKg} kg` : 'pH hiện tại đã đạt chuẩn'}
            </span>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200">
            Cho {areaCong} công ({areaCong * 1000}m²)
          </span>
        </div>

        <p className="text-[11px] text-slate-500 font-medium italic">
          * Lưu ý: Chia thành 2–3 đợt bón xung quanh hình chiếu tán lá sầu riêng, tránh bón dồn 1 lần sát gốc.
        </p>
      </div>

      {/* 4. SALINITY FLUSHING PREREQUISITE CHECKLIST */}
      <div className="p-4 bg-sky-50 border-2 border-sky-300 rounded-2xl text-sky-950 text-xs sm:text-sm space-y-2">
        <h4 className="font-extrabold text-sky-900 flex items-center gap-1.5 text-sm sm:text-base">
          <span>🌊</span>
          <span>Điều kiện khi nào nên tưới xả mặn (EC)?</span>
        </h4>
        <p className="text-sky-900 font-medium leading-relaxed">
          Chỉ tiến hành tưới xả mặn khi đáp ứng đủ 4 điều kiện sau:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-semibold text-sky-900">
          <li>EC đất đo thực tế cao trên 2,0 dS/m;</li>
          <li>Đã kiểm tra nguồn nước sông/kênh ngọt an toàn (độ mặn nước &lt; 0,5‰);</li>
          <li>Vườn có rãnh mương thoát nước tốt, không bị nghẽn;</li>
          <li>Tới nước xả mặn không làm vườn bị ngập úng sâu thêm.</li>
        </ul>
      </div>

      {/* 5. FORMAL DISCLAIMER */}
      <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Khuyến cáo an toàn:</strong> Mọi số liệu liều lượng vôi, phân bón hay quy trình xả mặn trên ứng dụng chỉ mang tính chất tham khảo chung. Bà con nên hỏi ý kiến cán bộ kỹ thuật nông nghiệp địa phương trước khi thực hiện quy mô lớn.
        </p>
      </div>

    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Garden } from '../types';
import { createSurveyPlan, SurveyConfig } from '../utils/surveyPlanner';

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const SurveyPlanner: React.FC<{ garden: Garden }> = ({ garden }) => {
  const key = `cdguard-survey-v1-${garden.id}`;
  const [config, setConfig] = useState<SurveyConfig>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) { createSurveyPlan(saved); return saved; }
    } catch { /* Use garden dimensions if no valid saved plan exists. */ }
    return { length: garden.length || 100, width: garden.width || 100, rowSpacing: 8, treeSpacing: 8, startDate: today() };
  });
  const [day, setDay] = useState(0);
  const [message, setMessage] = useState('');
  const result = useMemo(() => {
    try { return { plan: createSurveyPlan(config), error: '' }; }
    catch (error) { return { plan: null, error: (error as Error).message }; }
  }, [config]);
  const update = (patch: Partial<SurveyConfig>) => { setConfig(previous => ({ ...previous, ...patch })); setMessage('Chưa lưu thay đổi'); };
  const plan = result.plan;
  const points = plan?.days[day] || [];
  const date = new Date(config.startDate + 'T12:00:00');
  date.setDate(date.getDate() + day);
  return <details className="bg-white border border-emerald-200 rounded-2xl p-4">
    <summary className="font-bold text-emerald-800 cursor-pointer">Kế hoạch khảo sát 10 ngày</summary>
    <div className="space-y-4 mt-4 text-sm">
      <p className="font-semibold">Vườn: {garden.name}</p>
      <p className="text-amber-800 bg-amber-50 rounded-xl p-3">Kế hoạch thử nghiệm: số cây đề xuất chưa phải định mức được kiểm chứng. Cần đối chiếu cây, mương và các khu đất thực tế trước khi đi đo.</p>
      <label className="block">Kích thước vuông tham khảo
        <select aria-label="Kích thước vuông tham khảo" value="" onChange={e => update({ length: Number(e.target.value), width: Number(e.target.value) })} className="block border rounded-lg p-2 w-full mt-1">
          <option value="">Chọn mức 100–1.000 m hoặc nhập bên dưới</option>
          {Array.from({ length: 19 }, (_, i) => 100 + i * 50).map(size => <option key={size} value={size}>{size} × {size} m</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {([['length', 'Chiều dài (m)'], ['width', 'Chiều rộng (m)'], ['rowSpacing', 'Cách hàng (m)'], ['treeSpacing', 'Cách cây (m)']] as const).map(([field, label]) => <label key={field}>{label}<input type="number" min={field.includes('Spacing') ? 2 : 1} max="1000" step="any" value={config[field] || ''} onChange={e => update({ [field]: Number(e.target.value) })} className="mt-1 p-2 border rounded-lg w-full" /></label>)}
      </div>
      <label className="block">Ngày bắt đầu<input type="date" value={config.startDate} onChange={e => update({ startDate: e.target.value })} className="block mt-1 p-2 border rounded-lg w-full" /></label>
      {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
      {plan && <>
        <div className="bg-emerald-50 p-3 rounded-xl space-y-1">
          <p><b>{plan.area.toLocaleString('vi-VN')} ha</b> · {plan.rows} hàng × {plan.cols} cột · {plan.total.toLocaleString('vi-VN')} cây dự kiến</p>
          <p>Mỗi ngày: {plan.fixedCount} cây cố định + tối đa {plan.budget.rotating} cây luân phiên; 3 điểm/cây.</p>
          <p>10 ngày: {plan.uniqueTrees.toLocaleString('vi-VN')} cây khác nhau ({(100 * plan.uniqueTrees / plan.total).toFixed(1)}% số cây dự kiến).</p>
          <p className="text-xs">Chưa trừ mương/đường. Tỷ lệ cây không phải độ chính xác. Vườn chữ nhật dùng mức ngân sách theo diện tích, làm tròn lên mức tham khảo kế tiếp.</p>
        </div>
        <button type="button" onClick={() => { try { localStorage.setItem(key, JSON.stringify(config)); setMessage('Đã lưu kế hoạch trên thiết bị cho vườn này.'); } catch { setMessage('Không lưu được kế hoạch. Vui lòng kiểm tra bộ nhớ thiết bị.'); } }} className="bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl">Lưu kế hoạch cho vườn</button>
        <p role="status">{message}</p>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Chọn ngày khảo sát">{plan.days.map((_, i) => <button key={i} type="button" aria-pressed={day === i} onClick={() => setDay(i)} className={`shrink-0 px-3 py-2 rounded-lg ${day === i ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}>Ngày {i + 1}</button>)}</div>
        <p className="font-bold">Ngày {day + 1} · {date.toLocaleDateString('vi-VN')} · {points.length} cây / {points.length * 3} điểm</p>
        <p>Khoảng {points.length * 3} phút đo, giả sử 3 phút/cây; chưa tính đi lại và chuẩn bị.</p>
        {points.every(p => p.fixed) && <p>Đã phân hết cây luân phiên của sơ đồ. Ngày này chỉ theo dõi cây cố định.</p>}
        <p className="text-xs text-slate-600">Tuyến dự kiến đi zích zắc theo hàng. Hàng 1 tính từ đầu vườn, cột 1 từ bên trái. Tọa độ x/y tính bằng mét từ góc đầu-trái; chưa phải GPS hay cây đã đăng ký trong app.</p>
        <div className="overflow-auto max-h-80 border rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-emerald-50 sticky top-0"><tr><th className="p-2">Thứ tự</th><th>Hàng / cột</th><th>x / y (m)</th><th>Nhóm</th></tr></thead><tbody>{points.map((p, i) => <tr key={`${p.row}-${p.col}`} className="border-t"><td className="p-2">{i + 1}</td><td>H{p.row} / C{p.col}</td><td>{p.x.toFixed(1)} / {p.y.toFixed(1)}</td><td>{p.fixed ? 'Cố định' : 'Luân phiên'}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-600">Mỗi cây: 3 vị trí quanh tán, giữ cùng quy trình và độ sâu theo thiết bị. Ghi riêng mưa/tưới/bón phân. Đây là lịch khảo sát, không tự tạo số đo hoặc cảnh báo cho cây.</p>
      </>}
    </div>
  </details>;
};

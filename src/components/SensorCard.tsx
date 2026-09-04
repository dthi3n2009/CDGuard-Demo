import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number | string;
  unit: string;
  targetRange: string;
  icon: LucideIcon;
  status: 'normal' | 'warning' | 'danger';
  statusText: string;
  note: string;
  minVal?: number;
  maxVal?: number;
  type?: 'ph' | 'ec' | 'moisture' | 'temp';
}

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  value,
  unit,
  targetRange,
  icon: Icon,
  status,
  statusText,
  note,
  minVal = 0,
  maxVal = 100,
  type = 'ph'
}) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-400',
          badgeBg: 'bg-red-600 text-white',
          iconBg: 'bg-red-600 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-400',
          badgeBg: 'bg-amber-500 text-slate-950',
          iconBg: 'bg-amber-500 text-slate-950',
        };
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-400',
          badgeBg: 'bg-emerald-700 text-white',
          iconBg: 'bg-emerald-700 text-white',
        };
    }
  };

  const style = getStatusStyle();
  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  // Calculate percentage for visual gauge
  const range = Math.max(maxVal - minVal, 1);
  const clampedVal = Math.min(Math.max(numValue, minVal), maxVal);
  const percentage = Math.min(Math.max(((clampedVal - minVal) / range) * 100, 6), 94);

  return (
    <div className={`p-2.5 sm:p-3 rounded-2xl border-2 ${style.bg} ${style.border} flex flex-col justify-between shadow-xs`}>
      {/* Title & Status Badge */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-xl ${style.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-black text-[#1F2D24] uppercase">
            {title}
          </span>
        </div>
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${style.badgeBg}`}>
          {statusText}
        </span>
      </div>

      {/* Main Big Number */}
      <div className="my-1 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-black text-[#1F2D24] tracking-tight">
            {value}
          </span>
          <span className="text-xs font-bold text-slate-600">{unit}</span>
        </div>
        <span className="text-[10px] font-extrabold text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border border-slate-300">
          Chuẩn: {targetRange}
        </span>
      </div>

      {/* Visual Color Meter Bar */}
      <div className="relative h-2.5 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300 mt-1">
        {type === 'ph' && (
          <div className="absolute inset-0 flex">
            <div className="w-[38%] bg-red-400" />
            <div className="w-[20%] bg-emerald-500" />
            <div className="w-[42%] bg-amber-400" />
          </div>
        )}
        {type === 'ec' && (
          <div className="absolute inset-0 flex">
            <div className="w-[50%] bg-emerald-500" />
            <div className="w-[12.5%] bg-amber-400" />
            <div className="w-[37.5%] bg-red-500" />
          </div>
        )}
        {type === 'moisture' && (
          <div className="absolute inset-0 flex">
            <div className="w-[50%] bg-amber-400" />
            <div className="w-[18.75%] bg-emerald-500" />
            <div className="w-[31.25%] bg-red-500" />
          </div>
        )}
        {type === 'temp' && (
          <div className="absolute inset-0 flex">
            <div className="w-[33%] bg-blue-400" />
            <div className="w-[34%] bg-emerald-500" />
            <div className="w-[33%] bg-red-400" />
          </div>
        )}

        {/* Needle Pin */}
        <div
          className="absolute top-0 bottom-0 w-2 bg-slate-950 rounded-full border border-white shadow-xs"
          style={{ left: `calc(${percentage}% - 4px)` }}
        />
      </div>

      {/* Very short 1-line action tip */}
      <p className="text-[11px] text-slate-800 font-bold mt-1.5 line-clamp-1">
        👉 {note}
      </p>
    </div>
  );
};

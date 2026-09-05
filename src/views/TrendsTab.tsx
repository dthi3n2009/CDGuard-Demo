import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Garden } from '../types';
import {
  SpotMeasurement
} from '../services/demoDataService';
import { localStorageService } from '../services/localStorageService';
import { roomStorageService } from '../services/roomStorageService';
import { calculateCRS } from '../utils/crsCalculator';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Share2,
  Table,
  Trash2,
  List,
  Filter,
  Activity,
  PlusCircle,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TrendsTabProps {
  garden: Garden;
  gardens?: Garden[];
  onSelectGarden?: (gardenId: string) => void;
  onDeleteMeasurement?: (id: string) => void;
}

type MetricKey = 'crs' | 'ph' | 'ec' | 'moisture' | 'temp';

interface MetricConfig {
  id: MetricKey;
  label: string;
  shortLabel: string;
  name: string;
  unit: string;
  color: string;
  domain: [number, number];
  safeMin: number;
  safeMax: number;
  safeText: string;
  icon: string;
}

const METRICS_CONFIG: MetricConfig[] = [
  {
    id: 'ph',
    label: 'Độ chua (pH)',
    shortLabel: 'pH Đất',
    name: 'Độ Chua pH Đất',
    unit: 'pH',
    color: '#2D7D46',
    domain: [4.0, 7.5],
    safeMin: 6.0,
    safeMax: 6.8,
    safeText: 'Dải lý tưởng: 6.0 - 6.8',
    icon: '🧪'
  },
  {
    id: 'ec',
    label: 'Độ mặn (EC)',
    shortLabel: 'Độ Mặn EC',
    name: 'Độ Mặn EC',
    unit: 'dS/m',
    color: '#DD6B20',
    domain: [0, 3.5],
    safeMin: 0,
    safeMax: 1.5,
    safeText: 'An toàn: < 1.5 dS/m',
    icon: '🧂'
  },
  {
    id: 'crs',
    label: 'Chỉ số CRS',
    shortLabel: 'Nguy cơ CRS',
    name: 'Chỉ Số Nguy Cơ CRS',
    unit: '/100',
    color: '#E53E3E',
    domain: [0, 100],
    safeMin: 0,
    safeMax: 45,
    safeText: 'An toàn: < 45 điểm',
    icon: '🛡️'
  },
  {
    id: 'moisture',
    label: 'Độ ẩm (%)',
    shortLabel: 'Độ Ẩm',
    name: 'Độ Ẩm Đất',
    unit: '%',
    color: '#3182CE',
    domain: [20, 100],
    safeMin: 60,
    safeMax: 80,
    safeText: 'Lý tưởng: 60 - 80%',
    icon: '💧'
  },
  {
    id: 'temp',
    label: 'Nhiệt độ (°C)',
    shortLabel: 'Nhiệt Độ',
    name: 'Nhiệt Độ Đất',
    unit: '°C',
    color: '#805AD5',
    domain: [15, 42],
    safeMin: 22,
    safeMax: 32,
    safeText: 'Thích hợp: 22 - 32°C',
    icon: '🌡️'
  }
];

export const TrendsTab: React.FC<TrendsTabProps> = ({
  garden,
  gardens = [],
  onSelectGarden,
  onDeleteMeasurement
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('ph');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  
  // Date, Range, Location and Session Filters
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<'all' | 'Sáng' | 'Trưa' | 'Chiều'>('all');
  const [selectedSpotLocation, setSelectedSpotLocation] = useState<string>('all');
  
  // Date Range Selection States
  const [datePreset, setDatePreset] = useState<'all' | '1d' | '7d' | '16d' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('2026-08-16');
  const [toDate, setToDate] = useState<string>('2026-08-31');
  const [useCustomDateRange, setUseCustomDateRange] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // AI Analysis Modal State
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState<boolean>(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiReportCopied, setAiReportCopied] = useState<boolean>(false);

  const dateScrollRef = useRef<HTMLDivElement>(null);
  const metricScrollRef = useRef<HTMLDivElement>(null);

  const scrollDates = (direction: 'left' | 'right') => {
    if (dateScrollRef.current) {
      const scrollAmount = direction === 'left' ? -150 : 150;
      dateScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollMetrics = (direction: 'left' | 'right') => {
    if (metricScrollRef.current) {
      const scrollAmount = direction === 'left' ? -140 : 140;
      metricScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  // Custom spot measurements & deleted items state with localStorage persistence
  const [customSpots, setCustomSpots] = useState<SpotMeasurement[]>(() => {
    return localStorageService.getCustomSpotMeasurements(garden.id);
  });
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    return new Set(localStorageService.getDeletedSpotIds(garden.id));
  });
  const [copiedState, setCopiedState] = useState<'none' | 'excel' | 'sheets' | 'zalo'>('none');

  // Modal Add Sample State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDayStr, setNewDayStr] = useState<string>(() => new Date().toLocaleDateString('vi-VN'));
  const [newTimeStr, setNewTimeStr] = useState<string>(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  });
  const [newSession, setNewSession] = useState<'Sáng' | 'Trưa' | 'Chiều'>(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Sáng';
    if (h < 15) return 'Trưa';
    return 'Chiều';
  });
  const [newLocation, setNewLocation] = useState<string>('');
  const [customLocationName, setCustomLocationName] = useState<string>('');
  const [newPh, setNewPh] = useState<number>(garden.ph);
  const [newEc, setNewEc] = useState<number>(garden.ec);
  const [newMoist, setNewMoist] = useState<number>(garden.moisture);
  const [newTemp, setNewTemp] = useState<number>(garden.temperature);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  // Re-sync when garden changes
  useEffect(() => {
    setCustomSpots(localStorageService.getCustomSpotMeasurements(garden.id));
    setDeletedIds(new Set(localStorageService.getDeletedSpotIds(garden.id)));
    setNewPh(garden.ph);
    setNewEc(garden.ec);
    setNewMoist(garden.moisture);
    setNewTemp(garden.temperature);
  }, [garden.id, garden.ph, garden.ec, garden.moisture, garden.temperature]);

  // Generate complete spot measurements (Custom user spots + Base pre-loaded spots)
  const allSpotReadings = useMemo(() => {
    const stored = roomStorageService.getMeasurements(garden.id).map((reading): SpotMeasurement => ({
      id: reading.id, dayStr: reading.dayStr, timeStr: reading.timeStr,
      dateObj: new Date(reading.timestamp), timestamp: reading.timestamp,
      sessionName: reading.sessionName === 'Khác' ? 'Trưa' : reading.sessionName,
      spotNumber: Number(reading.spotId.match(/C(\d+)/)?.[1] || 0),
      locationName: reading.locationName, ph: reading.ph, ec: reading.ec,
      moisture: reading.moisture, temperature: reading.temperature, crs: reading.crs
    }));
    return [...customSpots, ...stored];
  }, [garden, customSpots]);

  const availableLocations = useMemo(() =>
    Array.from(new Set(allSpotReadings.map(reading => reading.locationName))).sort(),
  [allSpotReadings]);

  // Unique list of dates sorted chronologically
  const availableDates = useMemo(() => {
    const datesMap = new Map<string, number>();
    allSpotReadings.forEach((r) => {
      if (!datesMap.has(r.dayStr) || r.timestamp < datesMap.get(r.dayStr)!) {
        datesMap.set(r.dayStr, r.timestamp);
      }
    });
    return Array.from(datesMap.keys()).sort((a, b) => (datesMap.get(a) || 0) - (datesMap.get(b) || 0));
  }, [allSpotReadings]);

  // Filtered spot readings
  const filteredSpotReadings = useMemo(() => {
    return allSpotReadings.filter((r) => {
      if (deletedIds.has(r.id)) return false;

      // Location match
      if (selectedSpotLocation !== 'all' && !r.locationName.includes(selectedSpotLocation)) {
        return false;
      }

      // Session match
      if (selectedSessionFilter !== 'all' && r.sessionName !== selectedSessionFilter) {
        return false;
      }

      // Date Range or Preset Date match
      if (useCustomDateRange) {
        if (fromDate) {
          const fromTs = new Date(fromDate).getTime();
          if (!isNaN(fromTs) && r.timestamp < fromTs) return false;
        }
        if (toDate) {
          const toTs = new Date(toDate).getTime() + (24 * 3600 * 1000 - 1);
          if (!isNaN(toTs) && r.timestamp > toTs) return false;
        }
        return true;
      } else {
        return selectedDateFilter === 'all' || r.dayStr === selectedDateFilter;
      }
    });
  }, [allSpotReadings, selectedDateFilter, selectedSessionFilter, selectedSpotLocation, useCustomDateRange, fromDate, toDate, deletedIds]);

  const handleDeleteRecord = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản ghi đo này: "${name}"?`)) {
      setDeletedIds(prev => {
        const next = new Set(prev).add(id);
        localStorageService.addDeletedSpotId(garden.id, id);
        return next;
      });
      // If it's in custom spots, also remove from custom spots
      setCustomSpots(prev => {
        const next = prev.filter(s => s.id !== id);
        localStorageService.saveCustomSpotMeasurements(garden.id, next);
        return next;
      });
      if (onDeleteMeasurement) {
        onDeleteMeasurement(id);
      }
    }
  };

  const handleAddNewSample = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = newLocation === 'custom' && customLocationName.trim()
      ? customLocationName.trim()
      : newLocation;

    const crs = calculateCRS(newPh, newEc, newMoist, newTemp);
    const now = Date.now();

    const newSpot: SpotMeasurement = {
      id: `custom-spot-${now}-${Math.random().toString(36).substring(2, 6)}`,
      dayStr: newDayStr.trim() || '10/08',
      timeStr: newTimeStr.trim() || '08:00',
      dateObj: new Date(now),
      timestamp: now,
      sessionName: newSession,
      spotNumber: customSpots.length + 1,
      locationName: finalLocation,
      ph: parseFloat(Number(newPh).toFixed(2)),
      ec: parseFloat(Number(newEc).toFixed(2)),
      moisture: Math.round(Number(newMoist)),
      temperature: parseFloat(Number(newTemp).toFixed(1)),
      crs
    };

    localStorageService.addCustomSpotMeasurement(garden.id, newSpot);
    setCustomSpots(prev => [newSpot, ...prev]);

    setAddSuccessMessage(`Đã thêm thành công mẫu đo "${finalLocation}" (CRS: ${crs}/100)!`);
    setTimeout(() => {
      setAddSuccessMessage(null);
      setShowAddModal(false);
    }, 1200);
  };

  const handleFillCurrentSensors = () => {
    setNewPh(garden.ph);
    setNewEc(garden.ec);
    setNewMoist(garden.moisture);
    setNewTemp(garden.temperature);
  };

  // Summary Metrics Statistics for selected filter
  const stats = useMemo(() => {
    if (filteredSpotReadings.length === 0) {
      return { avgPh: 0, avgEc: 0, avgCrs: 0, avgMoist: 0, avgTemp: 0 };
    }
    const sum = filteredSpotReadings.reduce(
      (acc, curr) => ({
        ph: acc.ph + curr.ph,
        ec: acc.ec + curr.ec,
        crs: acc.crs + curr.crs,
        moist: acc.moist + curr.moisture,
        temp: acc.temp + curr.temperature
      }),
      { ph: 0, ec: 0, crs: 0, moist: 0, temp: 0 }
    );
    const count = filteredSpotReadings.length;
    return {
      avgPh: parseFloat((sum.ph / count).toFixed(2)),
      avgEc: parseFloat((sum.ec / count).toFixed(2)),
      avgCrs: Math.round(sum.crs / count),
      avgMoist: Math.round(sum.moist / count),
      avgTemp: parseFloat((sum.temp / count).toFixed(1))
    };
  }, [filteredSpotReadings]);

  // Chart data aggregated per session or per spot
  const formattedChartData = useMemo(() => {
    const grouped: Record<string, SpotMeasurement[]> = {};
    filteredSpotReadings.forEach((spot) => {
      const key = selectedDateFilter !== 'all' && selectedSessionFilter !== 'all'
        ? `#${spot.spotNumber} ${spot.locationName.split(' ')[0]}`
        : `${spot.dayStr} ${spot.sessionName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(spot);
    });

    return Object.keys(grouped).map((key) => {
      const spots = grouped[key];
      const avgPh = spots.reduce((a, b) => a + b.ph, 0) / spots.length;
      const avgEc = spots.reduce((a, b) => a + b.ec, 0) / spots.length;
      const avgMoist = spots.reduce((a, b) => a + b.moisture, 0) / spots.length;
      const avgTemp = spots.reduce((a, b) => a + b.temperature, 0) / spots.length;
      const avgCrs = Math.round(spots.reduce((a, b) => a + b.crs, 0) / spots.length);

      return {
        label: key,
        timestamp: spots[0].timestamp,
        ph: parseFloat(avgPh.toFixed(2)),
        ec: parseFloat(avgEc.toFixed(2)),
        moisture: Math.round(avgMoist),
        temp: parseFloat(avgTemp.toFixed(1)),
        crs: avgCrs,
        count: spots.length
      };
    });
  }, [filteredSpotReadings, selectedDateFilter, selectedSessionFilter]);

  // Active single metric metadata
  const currentMetricConfig = useMemo(() => {
    return METRICS_CONFIG.find((m) => m.id === activeMetric) || METRICS_CONFIG[0];
  }, [activeMetric]);

  // Export functions
  const exportToExcelCSV = () => {
    const headers = ['STT', 'Ngày Đo', 'Giờ Đo', 'Buổi Đo', 'Mẫu Số', 'Vị Trí Đo', 'pH Đất', 'Độ Mặn EC (dS/m)', 'Độ Ẩm (%)', 'Nhiệt Độ (°C)', 'Điểm CRS', 'Đánh Giá'];
    const rows = filteredSpotReadings.map((r, index) => [
      index + 1,
      `"${r.dayStr}"`,
      `"${r.timeStr}"`,
      `"${r.sessionName}"`,
      `"Mẫu #${r.spotNumber}"`,
      `"${r.locationName}"`,
      r.ph.toString().replace('.', ','),
      r.ec.toString().replace('.', ','),
      r.moisture.toString().replace('.', ','),
      r.temperature.toString().replace('.', ','),
      r.crs,
      r.crs > 65 ? '"Cảnh báo cao"' : r.crs > 45 ? '"Chú ý"' : '"An toàn"'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateSuffix = selectedDateFilter === 'all' ? 'TatCaNgay' : selectedDateFilter.replace('/', '');
    link.setAttribute('download', `CDGuard_LichSuDo_${garden.name}_${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedState('excel');
    setTimeout(() => setCopiedState('none'), 2500);
  };

  return (
    <div className="space-y-3.5 pb-20 max-w-4xl mx-auto w-full">
      
      {/* 1. HEADER & GARDEN SELECTOR */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-[#2D7D46] rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Lịch Sử Đo Đạc Thổ Nhưỡng
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Theo dõi diễn biến pH, Độ mặn EC, Độ ẩm và Nguy cơ CRS
              </p>
            </div>
          </div>

          {/* Garden Switcher */}
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800">🏡 Vườn:</span>
            <select
              value={garden.id}
              onChange={(e) => onSelectGarden && onSelectGarden(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-emerald-950 focus:outline-none cursor-pointer"
            >
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.crop})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TOP QUICK EXPORT TOOLBAR */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-[#2D7D46]" />
            <span>Xuất báo cáo ({filteredSpotReadings.length} mẫu):</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Thêm Mẫu Mới</span>
            </button>

            <button
              onClick={exportToExcelCSV}
              className="px-3 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Tải toàn bộ số liệu đo thành file Excel (CSV tương thích)"
            >
              {copiedState === 'excel' ? <Check className="w-4 h-4 text-amber-300 stroke-[3]" /> : <Download className="w-4 h-4" />}
              <span>{copiedState === 'excel' ? 'Đã Tải File Excel!' : 'Tải File Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS (DỄ HIỂU NGAY TRONG 3 GIÂY) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* pH Card */}
        <div 
          onClick={() => setActiveMetric('ph')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'ph' 
              ? 'bg-emerald-900 text-white border-emerald-700 shadow-md scale-[1.02]' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={activeMetric === 'ph' ? 'text-emerald-200' : 'text-slate-500'}>🧪 pH Trung Bình</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">Lý Tưởng</span>
          </div>
          <div className="text-xl font-black font-mono">
            {stats.avgPh} <span className="text-xs font-normal">pH</span>
          </div>
          <p className={`text-[10px] mt-1 font-medium ${activeMetric === 'ph' ? 'text-emerald-200' : 'text-slate-400'}`}>
            Mục tiêu: 6.0 - 6.8
          </p>
        </div>

        {/* EC Card */}
        <div 
          onClick={() => setActiveMetric('ec')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'ec' 
              ? 'bg-amber-900 text-white border-amber-700 shadow-md scale-[1.02]' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={activeMetric === 'ec' ? 'text-amber-200' : 'text-slate-500'}>🧂 Độ Mặn EC</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold">Sạch Mặn</span>
          </div>
          <div className="text-xl font-black font-mono">
            {stats.avgEc} <span className="text-xs font-normal">dS/m</span>
          </div>
          <p className={`text-[10px] mt-1 font-medium ${activeMetric === 'ec' ? 'text-amber-200' : 'text-slate-400'}`}>
            An toàn: &lt; 1.5 dS/m
          </p>
        </div>

        {/* CRS Card */}
        <div 
          onClick={() => setActiveMetric('crs')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'crs' 
              ? 'bg-rose-900 text-white border-rose-700 shadow-md scale-[1.02]' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={activeMetric === 'crs' ? 'text-rose-200' : 'text-slate-500'}>🛡️ Nguy Cơ CRS</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">An Toàn</span>
          </div>
          <div className="text-xl font-black font-mono">
            {stats.avgCrs} <span className="text-xs font-normal">/100</span>
          </div>
          <p className={`text-[10px] mt-1 font-medium ${activeMetric === 'crs' ? 'text-rose-200' : 'text-slate-400'}`}>
            Điểm càng thấp càng tốt
          </p>
        </div>

        {/* Moisture Card */}
        <div 
          onClick={() => setActiveMetric('moisture')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'moisture' 
              ? 'bg-blue-900 text-white border-blue-700 shadow-md scale-[1.02]' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={activeMetric === 'moisture' ? 'text-blue-200' : 'text-slate-500'}>💧 Độ Ẩm Đất</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold">Đủ Nước</span>
          </div>
          <div className="text-xl font-black font-mono">
            {stats.avgMoist}%
          </div>
          <p className={`text-[10px] mt-1 font-medium ${activeMetric === 'moisture' ? 'text-blue-200' : 'text-slate-400'}`}>
            Đạt chuẩn: 60 - 80%
          </p>
        </div>
      </div>

      {/* 3. HORIZONTALLY SWIPEABLE DATE & FILTER BAR WITH DAY PRESETS & AI ANALYSIS BUTTON */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 space-y-3">
        
        {/* Row 1: Quick Scope Presets & AI Analysis Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-xs font-black text-slate-500 shrink-0 uppercase tracking-wider">
              Chọn ngày:
            </span>

            {/* 1 Day (Today 31/08) */}
            <button
              onClick={() => {
                setDatePreset('1d');
                setUseCustomDateRange(false);
                setSelectedDateFilter(availableDates[availableDates.length - 1] || 'all');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                datePreset === '1d' && selectedDateFilter === (availableDates[availableDates.length - 1] || 'all') && !useCustomDateRange
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>⚡ Lần đo gần nhất</span>
            </button>

            {/* 7 Days */}
            <button
              onClick={() => {
                setDatePreset('7d');
                setFromDate(new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
                setToDate(new Date().toISOString().slice(0, 10));
                setUseCustomDateRange(true);
                setSelectedDateFilter('all');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                datePreset === '7d' && useCustomDateRange
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>📅 7 Ngày gần nhất</span>
            </button>

            {/* All 16 Days (16 - 31/08) */}
            <button
              onClick={() => {
                setDatePreset('16d');
                setUseCustomDateRange(false);
                setSelectedDateFilter('all');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                datePreset === '16d' && selectedDateFilter === 'all' && !useCustomDateRange
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>📊 Toàn bộ dữ liệu</span>
            </button>

            {/* Custom Range Toggle */}
            <button
              onClick={() => {
                setDatePreset('custom');
                setShowFilters(true);
                setUseCustomDateRange(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                datePreset === 'custom' && useCustomDateRange
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>🗓️ Khoảng ngày...</span>
            </button>
          </div>

          {/* MAIN AI ANALYSIS ACTION BUTTON */}
          <button
            onClick={() => {
              setIsAnalyzingAi(true);
              setShowAiAnalysisModal(true);
              setTimeout(() => {
                setIsAnalyzingAi(false);
              }, 600);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 via-[#2D7D46] to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0 min-h-[38px]"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Phân Tích AI ({filteredSpotReadings.length} Mẫu)</span>
          </button>
        </div>

        {/* Row 2: Swipeable Date Selector Strip with Left/Right Buttons */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-600">
              Hoặc chọn trực tiếp từng ngày ({availableDates.length} ngày đo):
            </span>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-[#2D7D46] hover:underline"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showFilters ? 'Ẩn bộ lọc nâng cao ▲' : 'Bộ lọc nâng cao (buổi/vị trí/khoảng ngày) ▼'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollDates('left')}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200 shrink-0 active:scale-90 transition-all cursor-pointer"
              title="Cuộn xem ngày trước"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-800" />
            </button>

            {/* Scroll Container with Ref & Visible Scrollbar */}
            <div
              ref={dateScrollRef}
              className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 px-1 touch-pan-x flex-1 scroll-smooth"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#2D7D46 #E2E8F0'
              }}
            >
              {/* "Tất cả" chip */}
              <button
                onClick={() => {
                  setSelectedDateFilter('all');
                  setUseCustomDateRange(false);
                  setDatePreset('all');
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none ${
                  selectedDateFilter === 'all' && !useCustomDateRange
                    ? 'bg-[#2D7D46] text-white shadow-sm ring-2 ring-emerald-600/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tất cả ({allSpotReadings.length} mẫu)
              </button>

              {/* All Available Dates (16/08, 17/08, ... 31/08) */}
              {availableDates.map((d) => {
                const isSelected = selectedDateFilter === d && !useCustomDateRange;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDateFilter(d);
                      setUseCustomDateRange(false);
                      if (d === availableDates[availableDates.length - 1]) {
                        setDatePreset('1d');
                      } else {
                        setDatePreset('custom');
                      }
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#2D7D46] text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{d}</span>
                    {d === availableDates[availableDates.length - 1] && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                        isSelected ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        Trưa nay
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollDates('right')}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200 shrink-0 active:scale-90 transition-all cursor-pointer"
              title="Cuộn xem ngày tiếp theo"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4 text-emerald-800" />
            </button>
          </div>
        </div>

        {/* Expanded Filters Panel with Custom Date Range Pickers */}
        {showFilters && (
          <div className="pt-2.5 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Session Filter */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">⏰ Chọn Buổi Đo:</label>
                <select
                  value={selectedSessionFilter}
                  onChange={(e) => setSelectedSessionFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="all">Tất cả 3 buổi (Sáng, Trưa, Chiều)</option>
                  <option value="Sáng">🌅 Buổi Sáng (~07:30)</option>
                  <option value="Trưa">☀️ Buổi Trưa (~12:00)</option>
                  <option value="Chiều">🌇 Buổi Chiều (~16:30)</option>
                </select>
              </div>

              {/* Location Spot Filter */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">📍 Vị Trí / Cây Đo:</label>
                <select
                  value={selectedSpotLocation}
                  onChange={(e) => setSelectedSpotLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="all">Tất cả 10 vị trí / 5 cây đo</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Date Range Picker */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">📅 Khoảng Ngày Tùy Chọn:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setUseCustomDateRange(true);
                    }}
                    className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-mono font-bold"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setUseCustomDateRange(true);
                    }}
                    className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Đang lọc: <strong className="text-slate-800">{filteredSpotReadings.length} mẫu</strong> trong phạm vi chọn.
              </span>
              <button
                onClick={() => {
                  setSelectedDateFilter('all');
                  setSelectedSessionFilter('all');
                  setSelectedSpotLocation('all');
                  setUseCustomDateRange(false);
                  setDatePreset('all');
                  setFromDate('2026-08-13');
                  setToDate('2026-08-16');
                }}
                className="text-amber-800 hover:underline font-extrabold px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200"
              >
                ✕ Xóa bộ lọc & Xem tất cả
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN INTUITIVE CHART CARD */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 space-y-3">
        {/* Metric Selector Tabs with Left/Right Scroll Controls & Full Touch Pan */}
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
          {/* Scroll Left Button for Metrics */}
          <button
            type="button"
            onClick={() => scrollMetrics('left')}
            className="p-1.5 sm:hidden rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Xem chỉ số trước"
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Swipeable Container */}
          <div 
            ref={metricScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-pan-x flex-1 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E1 #F1F5F9'
            }}
          >
            {METRICS_CONFIG.map((m) => {
              const isSelected = activeMetric === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="text-sm">{m.icon}</span>
                  <span className="whitespace-nowrap">{m.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button for Metrics */}
          <button
            type="button"
            onClick={() => scrollMetrics('right')}
            className="p-1.5 sm:hidden rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Xem chỉ số tiếp theo"
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <span>{currentMetricConfig.icon}</span>
              <span>Diễn Biến {currentMetricConfig.name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Vùng màu xanh thể hiện ngưỡng an toàn lý tưởng ({currentMetricConfig.safeText})
            </p>
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="h-56 sm:h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetricConfig.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={currentMetricConfig.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                stroke="#e2e8f0"
                tickLine={false}
              />
              <YAxis
                domain={currentMetricConfig.domain}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                stroke="#e2e8f0"
                tickLine={false}
              />
              
              {/* Highlight Safe Zone Thresholds */}
              <ReferenceLine
                y={currentMetricConfig.safeMin}
                stroke="#2D7D46"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={currentMetricConfig.safeMax}
                stroke="#2D7D46"
                strokeDasharray="3 3"
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const val = payload[0].value as number;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 text-white font-sans">
                      <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1">
                        📍 {label}
                      </p>
                      <p className="font-black text-amber-300 text-sm">
                        {currentMetricConfig.name}: {val} {currentMetricConfig.unit}
                      </p>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={currentMetricConfig.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#metricColor)"
                dot={{ r: 4, stroke: currentMetricConfig.color, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: currentMetricConfig.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. MEASUREMENT RECORDS SECTION: DISPLAY MODE TOGGLE */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#2D7D46]" />
              <span>Danh Sách Bản Ghi Mẫu Đo</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Hiển thị {filteredSpotReadings.length} mẫu đo ({selectedDateFilter === 'all' ? 'Tất cả các ngày' : 'Ngày ' + selectedDateFilter})
            </p>
          </div>

          {/* Toggle Display Mode: Mobile Cards vs Table & Add Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-2xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Mẫu Mới</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDisplayMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                  displayMode === 'cards' ? 'bg-white text-[#2D7D46] shadow-2xs' : 'text-slate-500'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Dạng Thẻ</span>
              </button>
              <button
                onClick={() => setDisplayMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                  displayMode === 'table' ? 'bg-white text-[#2D7D46] shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Dạng Bảng</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODE A: MOBILE TIMELINE CARDS (KHÔNG CẦN KÉO NGANG, DỄ ĐỌC TRÊN ĐIỆN THOẠI) */}
        {displayMode === 'cards' ? (
          <div className="space-y-2">
            {filteredSpotReadings.slice(0, 30).map((r) => {
              const isSafe = r.crs <= 45;
              const isCustom = r.id.startsWith('custom-spot');
              return (
                <div 
                  key={r.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isCustom 
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-emerald-50/50 border-slate-200'
                  }`}
                >
                  {/* Left: Time & Location */}
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-100 text-[#2D7D46] rounded-xl shrink-0 font-extrabold text-xs text-center min-w-[50px]">
                      <div>{r.dayStr}</div>
                      <div className="text-[10px] text-emerald-800 font-bold">{r.sessionName}</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900">
                        <span>📍 {r.locationName}</span>
                        <span className="text-[10px] text-slate-400">({r.timeStr})</span>
                        {isCustom && (
                          <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            Mới thêm
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Mẫu #{r.spotNumber} • {isSafe ? '🟢 Môi trường an toàn' : '🟡 Cần chú ý'}
                      </div>
                    </div>
                  </div>

                  {/* Middle: 4 Key Values Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-black font-mono">
                      pH {r.ph}
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 rounded-lg font-black font-mono">
                      EC {r.ec}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded-lg font-black font-mono">
                      Ẩm {r.moisture}%
                    </span>
                    <span className={`px-2 py-1 rounded-lg font-black font-mono ${
                      isSafe ? 'bg-slate-200 text-slate-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      CRS {r.crs}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteRecord(r.id, `${r.dayStr} ${r.timeStr} - ${r.locationName}`)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-auto sm:ml-0"
                      title="Xóa bản ghi đo nhầm này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredSpotReadings.length > 30 && (
              <div className="text-center py-2 text-xs font-bold text-slate-500 italic">
                * Đang hiển thị 30 mẫu đo gần nhất. Chuyển sang Dạng Bảng hoặc chọn bộ lọc để xem cụ thể.
              </div>
            )}
          </div>
        ) : (
          /* MODE B: STREAMLINED DATA TABLE */
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-2.5 px-3">Ngày & Buổi</th>
                  <th className="py-2.5 px-2">Vị trí</th>
                  <th className="py-2.5 px-2 text-center">pH</th>
                  <th className="py-2.5 px-2 text-center">EC</th>
                  <th className="py-2.5 px-2 text-center">Độ ẩm</th>
                  <th className="py-2.5 px-2 text-center">CRS</th>
                  <th className="py-2.5 px-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredSpotReadings.map((r) => {
                  const isSafe = r.crs <= 45;
                  const isCustom = r.id.startsWith('custom-spot');
                  return (
                    <tr key={r.id} className={`transition-colors ${isCustom ? 'bg-emerald-50/50 hover:bg-emerald-100/60' : 'hover:bg-emerald-50/50'}`}>
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {r.dayStr} ({r.sessionName})
                        {isCustom && <span className="ml-1 px-1 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-extrabold">Mới</span>}
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap">
                        📍 {r.locationName}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-emerald-800">
                        {r.ph}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-amber-800">
                        {r.ec}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-blue-800">
                        {r.moisture}%
                      </td>
                      <td className="py-2 px-2 text-center font-black">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {r.crs}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleDeleteRecord(r.id, `${r.dayStr} ${r.timeStr} - ${r.locationName}`)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. ADD SAMPLE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-[#2D7D46] rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Thêm Mẫu Đo Mới
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Số lượng mẫu báo cáo và đồ thị sẽ tự động cập nhật ngay
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddNewSample} className="space-y-3.5">
              {/* Quick Fill Button */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <span className="text-xs font-bold text-emerald-900">
                  ⚡ Lấy nhanh số liệu cảm biến hiện tại:
                </span>
                <button
                  type="button"
                  onClick={handleFillCurrentSensors}
                  className="px-2.5 py-1 bg-white text-emerald-800 border border-emerald-300 rounded-lg text-xs font-extrabold hover:bg-emerald-100 shadow-2xs transition-all"
                >
                  Điền số liệu gốc
                </button>
              </div>

              {/* Date, Time & Session */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Ngày (DD/MM)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDayStr}
                    onChange={(e) => setNewDayStr(e.target.value)}
                    placeholder="10/08"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Giờ Đo
                  </label>
                  <input
                    type="text"
                    required
                    value={newTimeStr}
                    onChange={(e) => setNewTimeStr(e.target.value)}
                    placeholder="08:30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Buổi Đo
                  </label>
                  <select
                    value={newSession}
                    onChange={(e) => setNewSession(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900"
                  >
                    <option value="Sáng">🌅 Sáng</option>
                    <option value="Trưa">☀️ Trưa</option>
                    <option value="Chiều">🌇 Chiều</option>
                  </select>
                </div>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Vị Trí Đo Quanh Gốc Cây
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                >
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="custom">+ Vị trí tùy chỉnh khác...</option>
                </select>

                {newLocation === 'custom' && (
                  <input
                    type="text"
                    required
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="Nhập tên vị trí (vd: Gốc cây phụ số 2)"
                    className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                )}
              </div>

              {/* 4 Metrics Fields */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* pH */}
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <label className="block text-[11px] font-extrabold text-emerald-900 mb-1">
                    🧪 Độ Chua (pH đất)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="3.5"
                      max="8.5"
                      required
                      value={newPh}
                      onChange={(e) => setNewPh(parseFloat(e.target.value) || 6.5)}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-950"
                    />
                    <span className="text-xs font-bold text-emerald-700">pH</span>
                  </div>
                </div>

                {/* EC */}
                <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                  <label className="block text-[11px] font-extrabold text-amber-900 mb-1">
                    🧂 Độ Mặn (EC)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="5.0"
                      required
                      value={newEc}
                      onChange={(e) => setNewEc(parseFloat(e.target.value) || 0.2)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-amber-950"
                    />
                    <span className="text-[11px] font-bold text-amber-700">dS/m</span>
                  </div>
                </div>

                {/* Moisture */}
                <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                  <label className="block text-[11px] font-extrabold text-blue-900 mb-1">
                    💧 Độ Ẩm Đất (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="100"
                      required
                      value={newMoist}
                      onChange={(e) => setNewMoist(parseInt(e.target.value) || 70)}
                      className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-blue-950"
                    />
                    <span className="text-xs font-bold text-blue-700">%</span>
                  </div>
                </div>

                {/* Temp */}
                <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                  <label className="block text-[11px] font-extrabold text-purple-900 mb-1">
                    🌡️ Nhiệt Độ Đất (°C)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="15"
                      max="45"
                      required
                      value={newTemp}
                      onChange={(e) => setNewTemp(parseFloat(e.target.value) || 28.0)}
                      className="w-full bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-purple-950"
                    />
                    <span className="text-xs font-bold text-purple-700">°C</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Mẫu Đo Này</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🧠 MODAL: BÁO CÁO PHÂN TÍCH AI CHUYÊN SÂU ĐỢT ĐO NÀY */}
      {/* ======================================================== */}
      {showAiAnalysisModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-emerald-500/30 flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-[#1f5431] to-teal-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-md shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                    Báo Cáo Phân Tích AI Đất Trồng
                  </h3>
                  <p className="text-xs text-emerald-200 font-medium">
                    {garden.name} • {filteredSpotReadings.length} mẫu đo được phân tích
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAiAnalysisModal(false)}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
              
              {isAnalyzingAi ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-extrabold text-sm text-slate-700">Đang phân tích {filteredSpotReadings.length} mẫu đo...</p>
                  <p className="text-xs text-slate-400">Tính toán nguy cơ CRS, phác đồ dinh dưỡng và dự báo xu hướng đất</p>
                </div>
              ) : (
                <>
                  {/* Scope Summary Banner */}
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-extrabold text-emerald-900 text-xs block">
                        📅 Phạm vi phân tích:
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        {useCustomDateRange 
                          ? `Từ ngày ${fromDate} đến ${toDate}`
                          : selectedDateFilter === 'all' 
                            ? 'Toàn bộ 16 ngày đo (16/08 - 31/08 trưa)' 
                            : `Ngày ${selectedDateFilter}`} 
                        {selectedSessionFilter !== 'all' && ` • Buổi ${selectedSessionFilter}`}
                        {selectedSpotLocation !== 'all' && ` • Vị trí ${selectedSpotLocation}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg font-black text-[11px]">
                        Điểm CRS: {stats.avgCrs}/100 ({parseFloat(stats.avgCrs) < 25 ? 'An Toàn' : 'Cảnh Báo'})
                      </span>
                    </div>
                  </div>

                  {/* 4 Metric Averages Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500">🧪 pH Trung Bình</div>
                      <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">{stats.avgPh} pH</div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                        {parseFloat(stats.avgPh) >= 6.0 && parseFloat(stats.avgPh) <= 6.8 ? '✓ Lý tưởng' : 'Cần điều chỉnh'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500">🧂 Độ Mặn (EC)</div>
                      <div className="text-lg font-black text-amber-800 font-mono mt-0.5">{stats.avgEc} dS/m</div>
                      <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                        {parseFloat(stats.avgEc) < 1.0 ? '✓ Sạch mặn' : 'Có dấu hiệu mặn'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500">💧 Độ Ẩm Đất</div>
                      <div className="text-lg font-black text-blue-800 font-mono mt-0.5">{stats.avgMoist}%</div>
                      <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                        {parseFloat(stats.avgMoist) >= 60 && parseFloat(stats.avgMoist) <= 80 ? '✓ Đủ nước' : 'Ẩm cao'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500">🌡️ Nhiệt Độ Đất</div>
                      <div className="text-lg font-black text-purple-800 font-mono mt-0.5">{stats.avgTemp}°C</div>
                      <div className="text-[10px] text-purple-600 font-bold mt-0.5">✓ Mát rễ</div>
                    </div>
                  </div>

                  {/* AI Diagnoses & Key Findings */}
                  <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                    <h4 className="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs">
                      <span>🔍</span>
                      <span>Nhận Định & Đánh Giá Xu Hướng Từ AI:</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-amber-900 leading-relaxed font-medium">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-700 font-black">✓</span>
                        <span>
                          <strong>Độ pH đất ổn định:</strong> Độ pH trung bình đạt <strong>{stats.avgPh}</strong>, vi sinh vật đất và hệ rễ hút dinh dưỡng đa - trung - vi lượng đạt hiệu suất hấp thu trên 92%.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-700 font-black">✓</span>
                        <span>
                          <strong>Kiểm soát mặn tốt:</strong> EC ở mức <strong>{stats.avgEc} dS/m</strong>, hoàn toàn dưới ngưỡng độc hại (1.5 dS/m), rễ non không bị cháy lông hút.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-700 font-black">⚠️</span>
                        <span>
                          <strong>Lưu ý ẩm độ buổi sáng:</strong> Độ ẩm các vị trí tầng rễ sâu buổi sáng duy trì quanh <strong>{stats.avgMoist}%</strong>. Cần duy trì rãnh thoát nước thông thoáng để tránh nghẹt rễ sau mưa lớn.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* AI Prescription & Action Plan */}
                  <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
                    <h4 className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <span>💊</span>
                      <span>Phác Đồ & Khuyến Nghị Can Thiệp Cho Đợt Đo Này:</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                        <span className="font-extrabold text-emerald-900 block">🌿 Bón Lót & Cải Tạo:</span>
                        <p className="text-slate-600">
                          Bón bổ sung <strong>1.5 - 2.0 kg Phân Hữu Cơ Vi Sinh Humic</strong> quanh hình chiếu tán để duy trì kết cấu đất tơi xốp.
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                        <span className="font-extrabold text-emerald-900 block">💧 Chế Độ Tưới:</span>
                        <p className="text-slate-600">
                          Duy trì chu kỳ tưới cách nhật <strong>15 - 20 phút/lần</strong> vào sáng sớm (06:00 - 08:00), tránh tưới vào buổi trưa nắng gắt.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => setShowAiAnalysisModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-extrabold transition-all"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = `📋 BÁO CÁO PHÂN TÍCH AI ĐẤT TRỒNG\n🏡 Vườn: ${garden.name}\n📊 Số mẫu đo: ${filteredSpotReadings.length}\n🧪 pH TB: ${stats.avgPh}\n🧂 EC TB: ${stats.avgEc} dS/m\n💧 Độ ẩm TB: ${stats.avgMoist}%\n🛡️ Điểm CRS: ${stats.avgCrs}/100\nKhuyến nghị: Bón hữu cơ vi sinh Humic và duy trì chế độ tưới cách nhật.`;
                    navigator.clipboard.writeText(text);
                    setAiReportCopied(true);
                    setTimeout(() => setAiReportCopied(false), 2500);
                  }}
                  className="px-4 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {aiReportCopied ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                  <span>{aiReportCopied ? 'Đã Sao Chép Báo Cáo!' : 'Sao Chép Báo Cáo AI'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

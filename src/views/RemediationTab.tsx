import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Garden, RemediationTask } from '../types';
import { getDefaultRemediationTasks } from '../services/demoDataService';
import { calculateCRS } from '../utils/crsCalculator';
import { localStorageService } from '../services/localStorageService';
import { roomStorageService, TreeLocation } from '../services/roomStorageService';
import { 
  ShieldAlert, 
  CheckSquare, 
  Square, 
  Calculator, 
  RefreshCw, 
  AlertTriangle, 
  Hammer, 
  CheckCircle2, 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  TreeDeciduous, 
  Info,
  Droplet,
  Zap,
  TestTube,
  Plus,
  X,
  Sprout,
  Leaf,
  Sparkles,
  Layers
} from 'lucide-react';

interface RemediationTabProps {
  garden: Garden;
  gardens?: Garden[];
  onSelectGarden?: (gardenId: string) => void;
}

export type SoilStatusLevel = 'safe' | 'warning' | 'danger';

export interface SoilEvaluation {
  level: SoilStatusLevel;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  headline: string;
  actionTitle: string;
  actionSubtitle: string;
  isTreatmentRequired: boolean; // true = cần xử lý sự cố, false = cải tạo bồi dưỡng đất tốt lên
}

export function evaluateSoilLevel(ph: number, ec: number, moisture: number): SoilEvaluation {
  // Danger triggers
  if (ph < 5.2 || ec > 2.0 || moisture > 80) {
    return {
      level: 'danger',
      badgeLabel: 'Cần Xử Lý Cấp Bách 🔴',
      badgeBg: 'bg-red-50 border-red-200',
      badgeText: 'text-red-700',
      headline: 'Vùng Đất Nguy Cơ Cao - Kích Hoạt Phác Đồ Xử Lý Cấp Bách',
      actionTitle: 'Phác Đồ Xử Lý Cấp Bách (Khắc Phục Sự Cố Đất)',
      actionSubtitle: 'Độ chua (pH < 5.2), độ mặn (EC > 2.0) hoặc ngập úng vượt ngưỡng nguy hiểm. Cần can thiệp ngay để ngăn ion Cadimi tự do xâm nhập vào rễ.',
      isTreatmentRequired: true
    };
  }
  
  // Warning triggers
  if (ph < 5.8 || ec > 1.2 || moisture > 75 || moisture < 50) {
    return {
      level: 'warning',
      badgeLabel: 'Cần Lưu Ý / Điều Chỉnh 🟡',
      badgeBg: 'bg-amber-50 border-amber-200',
      badgeText: 'text-amber-800',
      headline: 'Vùng Đất Chớm Lệch Ngưỡng - Cần Điều Chỉnh Phòng Ngừa',
      actionTitle: 'Kế Hoạch Điều Chỉnh Nhẹ & Cân Bằng Đất',
      actionSubtitle: 'Chỉ số có dấu hiệu chớm chua hoặc ẩm hơi cao. Cần bón lót vôi nhẹ, xới thoáng đất để đưa về vùng an toàn trước khi lan rộng.',
      isTreatmentRequired: true
    };
  }

  // Safe / Optimal triggers
  return {
    level: 'safe',
    badgeLabel: 'Đất Đạt Chuẩn - Bồi Dưỡng Phát Triển 🟢',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-[#2D7D46]',
    headline: 'Vùng Đất Đạt Chuẩn Tối Ưu - Không Cần Xử Lý Khẩn Cấp',
    actionTitle: 'Kế Hoạch Bồi Dưỡng, Cải Tạo & Phát Triển Vùng Đất Màu Mỡ',
    actionSubtitle: 'Chỉ số đất đạt mức lý tưởng. Bộ rễ khỏe mạnh và an toàn trước Cadimi. Tập trung nuôi dưỡng vi sinh, bồi đắp mùn hữu cơ để cây phát triển bền vững.',
    isTreatmentRequired: false
  };
}

export const RemediationTab: React.FC<RemediationTabProps> = ({ garden, gardens = [], onSelectGarden }) => {
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('all'); // 'all' or tree spot id
  const [treeList, setTreeList] = useState<TreeLocation[]>([]);
  
  // Quick filter for trees: 'all' | 'safe' | 'warning' | 'danger'
  const [treeFilter, setTreeFilter] = useState<'all' | 'safe' | 'warning' | 'danger'>('all');

  // Modal to add new tree directly in this tab
  const [isAddTreeModalOpen, setIsAddTreeModalOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeVariety, setNewTreeVariety] = useState('Sầu riêng Ri6');
  const [newTreeLocation, setNewTreeLocation] = useState('Góc 1 (Đầu liếp - Trái)');
  const [newTreePh, setNewTreePh] = useState(6.2);
  const [newTreeEc, setNewTreeEc] = useState(0.25);
  const [newTreeMoisture, setNewTreeMoisture] = useState(68);

  // Lime & Organic calculator parameters
  const [areaCong, setAreaCong] = useState<number>(garden.area || 1);
  const [soilType, setSoilType] = useState<'clay' | 'loam' | 'sand'>('loam');
  const [limeType, setLimeType] = useState<'caco3' | 'cao' | 'dolomite'>('caco3');
  const [showFaqGuide, setShowFaqGuide] = useState<boolean>(false);

  // Ref for horizontal tree carousel scrolling
  const carouselRef = useRef<HTMLDivElement>(null);

  // Load trees for current garden
  const loadGardenTrees = () => {
    const list = roomStorageService.getTreeLocations(garden.id);
    setTreeList(list);
  };

  useEffect(() => {
    loadGardenTrees();
    if (garden.area) {
      setAreaCong(garden.area);
    }
    setSelectedSpotId('all');
  }, [garden.id, garden.area]);

  // Dynamic Garden Averages computed from all trees
  const gardenStats = useMemo(() => {
    if (!treeList || treeList.length === 0) {
      return {
        avgPh: garden.ph || 6.3,
        avgEc: garden.ec || 0.22,
        avgMoisture: garden.moisture || 70,
        avgTemp: garden.temperature || 28.0,
        minPh: garden.ph || 6.3,
        maxPh: garden.ph || 6.3,
        lowestTreeName: 'Chưa có',
        highestTreeName: 'Chưa có',
        totalTrees: 0
      };
    }

    const phs = treeList.map(t => t.lastPh ?? garden.ph ?? 6.3);
    const ecs = treeList.map(t => t.lastEc ?? garden.ec ?? 0.22);
    const moists = treeList.map(t => t.lastMoisture ?? garden.moisture ?? 70);
    const temps = treeList.map(t => t.lastTemp ?? garden.temperature ?? 28.0);

    const avgPh = phs.reduce((a, b) => a + b, 0) / phs.length;
    const avgEc = ecs.reduce((a, b) => a + b, 0) / ecs.length;
    const avgMoisture = moists.reduce((a, b) => a + b, 0) / moists.length;
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    let lowestTree = treeList[0];
    let highestTree = treeList[0];
    treeList.forEach(t => {
      const p = t.lastPh ?? garden.ph ?? 6.3;
      if (p < (lowestTree.lastPh ?? garden.ph ?? 6.3)) lowestTree = t;
      if (p > (highestTree.lastPh ?? garden.ph ?? 6.3)) highestTree = t;
    });

    return {
      avgPh,
      avgEc,
      avgMoisture,
      avgTemp,
      minPh: Math.min(...phs),
      maxPh: Math.max(...phs),
      lowestTreeName: lowestTree?.name || 'Cây thấp nhất',
      highestTreeName: highestTree?.name || 'Cây cao nhất',
      totalTrees: treeList.length
    };
  }, [treeList, garden]);

  // Determine current active target measurement (whole garden or specific tree)
  const currentTree = useMemo(() => {
    return treeList.find((t) => t.id === selectedSpotId);
  }, [treeList, selectedSpotId]);

  const activePh = currentTree ? (currentTree.lastPh ?? garden.ph) : gardenStats.avgPh;
  const activeEc = currentTree ? (currentTree.lastEc ?? garden.ec) : gardenStats.avgEc;
  const activeMoisture = currentTree ? (currentTree.lastMoisture ?? garden.moisture) : gardenStats.avgMoisture;
  const activeTemp = currentTree ? (currentTree.lastTemp ?? garden.temperature) : gardenStats.avgTemp;
  const activeLocationName = currentTree ? currentTree.name : `Toàn bộ ${garden.name} (Trung bình ${gardenStats.totalTrees} cây)`;

  // Evaluate soil condition for current active target
  const currentEvaluation = useMemo(() => {
    return evaluateSoilLevel(activePh, activeEc, activeMoisture);
  }, [activePh, activeEc, activeMoisture]);

  const currentCrs = calculateCRS(activePh, activeEc, activeMoisture, activeTemp);

  // Generate tasks based on evaluated level and specific measurements
  const generateTailoredTasks = (level: SoilStatusLevel, ph: number, ec: number, moist: number, targetName: string): RemediationTask[] => {
    if (level === 'safe') {
      return [
        {
          id: 'safe-organic-humic',
          title: `Bồi đắp phân chuồng ủ hoai & Humic nuôi dưỡng đất tại ${targetName}`,
          period: 'short_term',
          costTier: 'medium',
          completed: false,
          category: 'general',
          description: `Đất đang đạt chuẩn an toàn lý tưởng (pH ${ph.toFixed(1)}, EC ${ec.toFixed(2)} dS/m). Cần duy trì bồi đắp chất mùn hữu cơ hoai mục (15-20 kg/gốc) kết hợp 30g Humic Acid để đất tơi xốp, giúp rễ tơ ăn sâu phát triển mạnh.`,
          impact: 'Nuôi dưỡng - Giúp tăng mật độ vi sinh vật có lợi và kích thích sinh trưởng rễ tự nhiên.'
        },
        {
          id: 'safe-grass-mulch',
          title: `Giữ thảm cỏ sinh học / rơm rạ mục che phủ bề mặt mo gốc`,
          period: 'immediate',
          costTier: 'low',
          completed: false,
          category: 'moisture',
          description: `Giữ lớp cỏ thực vật họ đậu hoặc rơm rạ mục cách cổ rễ 20cm để duy trì độ ẩm 60-70%, chống bức xạ nắng gắt làm nung nóng tầng rễ và chống xói mòn rửa trôi đất màu.`,
          impact: 'Bền vững - Ổn định nhiệt độ tầng rễ quanh ngưỡng lý tưởng 26°C - 28°C.'
        },
        {
          id: 'safe-trichoderma',
          title: `Tưới chế phẩm vi sinh Trichoderma & EM định kỳ 20 ngày/lần`,
          period: 'short_term',
          costTier: 'low',
          completed: false,
          category: 'general',
          description: `Bổ sung bào tử nấm đối kháng Trichoderma nhằm cạnh tranh tiêu diệt nấm Phytophthora gây thối rễ xì mủ, đồng thời hỗ trợ phân giải các khoáng chất lân khó tan trong đất.`,
          impact: 'Phòng ngừa - Tạo hàng rào sinh học bảo vệ rễ cây khỏe mạnh tự nhiên.'
        },
        {
          id: 'safe-water-monitor',
          title: `Kiểm tra độ mặn nguồn nước sông/mương trước mỗi cữ tưới`,
          period: 'long_term',
          costTier: 'low',
          completed: false,
          category: 'ec',
          description: `Chỉ bơm nước ngọt vào mương vườn khi độ mặn nước đo dưới 0.5‰ để bảo toàn vùng đất không bị nhiễm mặn bất ngờ trong mùa khô.`,
          impact: 'Bảo vệ - Duy trì ổn định độ phì nhiêu của vùng đất trong suốt vụ mùa.'
        }
      ];
    }

    if (level === 'warning') {
      return [
        {
          id: 'warn-ph-adjust',
          title: `Bón lót vôi nông nghiệp nâng nhẹ pH tại ${targetName}`,
          period: 'immediate',
          costTier: 'low',
          completed: false,
          category: 'ph',
          description: `pH hiện tại ${ph.toFixed(1)} hơi chua nhẹ. Rải đều 0.8 - 1.2 kg vôi bột CaCO3 hoặc dolomite quanh đường kính tán lá rồi tưới ẩm nhẹ để nâng dần pH lên mức 6.0 - 6.5.`,
          impact: 'Điều chỉnh - Chặn trước nguy cơ đất bị chua sâu và hỗ trợ rễ hấp thu đa vi lượng.'
        },
        {
          id: 'warn-aeration',
          title: `Xới nhẹ tạo độ thông thoáng mo và kiểm tra độ ẩm`,
          period: 'immediate',
          costTier: 'low',
          completed: false,
          category: 'moisture',
          description: `Xới nhẹ bề mặt mo đất sâu 3-5cm ngoài mép tán lá để tăng lưu thông oxy cho đất, giúp rễ hô hấp tốt và tránh ứ đọng khí độc ngạt rễ.`,
          impact: 'Phục hồi - Cung cấp oxy hòa tan cho tầng rễ hô hấp.'
        },
        {
          id: 'warn-humic-boost',
          title: `Bổ sung Axit Humic + Fulvic kích thích bung rễ non`,
          period: 'short_term',
          costTier: 'medium',
          completed: false,
          category: 'general',
          description: `Tưới gốc chế phẩm Humic kết hợp vi lượng để giải tỏa áp lực cho rễ tơ và tăng khả năng trao đổi ion CEC của hạt keo đất.`,
          impact: 'Tăng cường - Phục hồi hệ thống lông hút của rễ.'
        },
        {
          id: 'warn-recheck',
          title: `Đo lại cảm biến sau 48 - 72 giờ`,
          period: 'short_term',
          costTier: 'low',
          completed: false,
          category: 'general',
          description: `Cắm que đo hoặc kiểm tra dữ liệu cảm biến cập nhật để đảm bảo pH và độ ẩm đã quay về ngưỡng an toàn.`,
          impact: 'Kiểm chứng - Xác nhận hiệu quả điều chỉnh.'
        }
      ];
    }

    // Danger level
    const dangerTasks: RemediationTask[] = [];
    if (ph < 5.2) {
      dangerTasks.push({
        id: 'danger-lime-shock',
        title: `Bón vôi dập chua khẩn cấp (pH ${ph.toFixed(1)}) tại ${targetName}`,
        period: 'immediate',
        costTier: 'medium',
        completed: false,
        category: 'ph',
        description: `Đất chua gắt khiến kim loại nặng Cadimi hòa tan tăng vọt gấp nhiều lần. Bón ngay 1.8 - 2.5 kg vôi CaCO3/gốc quanh tán, tưới đẫm để nâng pH lên trên 6.0 ngay.`,
        impact: 'Cấp bách - Cố định ion Cadimi tự do vào phức hệ keo đất, chặn hấp thu lên trái.'
      });
    }

    if (ec > 2.0) {
      dangerTasks.push({
        id: 'danger-ec-flush',
        title: `Tưới xả mặn khẩn cấp bằng nước ngọt sông (EC ${ec.toFixed(2)} dS/m)`,
        period: 'immediate',
        costTier: 'low',
        completed: false,
        category: 'ec',
        description: `Nồng độ muối mặn cao làm cháy rễ tơ và đẩy ion độc hại vào dung dịch đất. Tưới tràn xả 2-3 cữ bằng nước ngọt sông (EC < 0.5), tạm dừng 100% phân NPK hóa học.`,
        impact: 'Cấp bách - Rửa trôi ion muối mặn ra khỏi vùng rễ tích cực.'
      });
    }

    if (moist > 78) {
      dangerTasks.push({
        id: 'danger-drainage',
        title: `Nạo vét khơi thông rãnh thoát nước đáy mo (Độ ẩm ${moist.toFixed(0)}%)`,
        period: 'immediate',
        costTier: 'low',
        completed: false,
        category: 'moisture',
        description: `Đất ngập úng yếm khí kích hoạt nấm lở cổ rễ Phytophthora và giải phóng độc tố. Đào xẻ rãnh thoát nước quanh mo sâu 15-20cm, mở nắp cống mương vườn hạ triệt để mực nước ngầm.`,
        impact: 'Cấp bách - Thoát nước khẩn cấp, chống nghẹt rễ và thối rễ tơ.'
      });
    }

    dangerTasks.push({
      id: 'danger-detox',
      title: `Tưới chế phẩm giải độc đất và phục hồi rễ sau khi hạ mặn/chua`,
      period: 'short_term',
      costTier: 'medium',
      completed: false,
      category: 'general',
      description: `Sau khi pH và EC đã hạ, tưới Acid Humic tinh khiết kết hợp phân bón lá amino acid để kích bung chồi rễ mới thay thế rễ tơ bị cháy.`,
      impact: 'Phục hồi - Tái tạo bộ rễ sau sự cố.'
    });

    return dangerTasks;
  };

  // Sync tasks when target changes
  useEffect(() => {
    const taskStorageKey = selectedSpotId !== 'all' ? `${garden.id}_${selectedSpotId}` : garden.id;
    const stored = localStorageService.getTasks(taskStorageKey);
    if (stored && stored.length > 0) {
      setTasks(stored);
    } else {
      const generated = generateTailoredTasks(
        currentEvaluation.level,
        activePh,
        activeEc,
        activeMoisture,
        activeLocationName
      );
      setTasks(generated);
      localStorageService.saveTasks(generated, taskStorageKey);
    }
  }, [garden.id, selectedSpotId, activePh, activeEc, activeMoisture, currentEvaluation.level, activeLocationName]);

  const toggleTask = (taskId: string) => {
    const taskStorageKey = selectedSpotId !== 'all' ? `${garden.id}_${selectedSpotId}` : garden.id;
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
    localStorageService.saveTasks(updated, taskStorageKey);
  };

  const resetTasksToRecommended = () => {
    const taskStorageKey = selectedSpotId !== 'all' ? `${garden.id}_${selectedSpotId}` : garden.id;
    const generated = generateTailoredTasks(
      currentEvaluation.level,
      activePh,
      activeEc,
      activeMoisture,
      activeLocationName
    );
    setTasks(generated);
    localStorageService.saveTasks(generated, taskStorageKey);
  };

  // Calculate estimated lime dosage
  const calculateLimeKg = () => {
    const targetPh = 6.0;
    const gap = Math.max(0, targetPh - activePh);
    if (gap === 0) return 0;

    const soilFactor = soilType === 'clay' ? 1.3 : soilType === 'sand' ? 0.7 : 1.0;
    const limeFactor = limeType === 'cao' ? 0.7 : limeType === 'dolomite' ? 0.9 : 1.0;

    const baseKgPerCong = gap * 150 * soilFactor * limeFactor;
    return Math.round(baseKgPerCong * areaCong);
  };

  const estimatedLimeKg = calculateLimeKg();

  // Calculate organic manure & humic recommendations for soil development
  const organicManureKg = Math.round(areaCong * 250); // ~250 kg per công (hoặc 15-20kg/gốc)
  const humicKg = Math.round(areaCong * 1.5 * 10) / 10; // ~1.5kg humic per công

  // Horizontal scroll helpers
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 260;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Filtered tree list according to selected filter
  const filteredTrees = useMemo(() => {
    if (treeFilter === 'all') return treeList;
    return treeList.filter(t => {
      const ph = t.lastPh ?? garden.ph;
      const ec = t.lastEc ?? garden.ec;
      const moist = t.lastMoisture ?? garden.moisture;
      const ev = evaluateSoilLevel(ph, ec, moist);
      return ev.level === treeFilter;
    });
  }, [treeList, treeFilter, garden.ph, garden.ec, garden.moisture]);

  // Statistics for badges
  const treeStats = useMemo(() => {
    let safeCount = 0;
    let warningCount = 0;
    let dangerCount = 0;

    treeList.forEach(t => {
      const ph = t.lastPh ?? garden.ph;
      const ec = t.lastEc ?? garden.ec;
      const moist = t.lastMoisture ?? garden.moisture;
      const ev = evaluateSoilLevel(ph, ec, moist);
      if (ev.level === 'safe') safeCount++;
      else if (ev.level === 'warning') warningCount++;
      else dangerCount++;
    });

    return { safeCount, warningCount, dangerCount, total: treeList.length };
  }, [treeList, garden.ph, garden.ec, garden.moisture]);

  // Add tree handler
  const handleAddNewTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeName.trim()) return;

    const newTreeId = `tree-${garden.id}-${Date.now()}`;
    const newTreeObj: TreeLocation = {
      id: newTreeId,
      gardenId: garden.id,
      spotNumber: treeList.length + 1,
      name: newTreeName.trim(),
      variety: newTreeVariety,
      treeAge: 10,
      height: 7.0,
      canopyWidth: 6.0,
      landmarkLocation: newTreeLocation,
      lastPh: newTreePh,
      lastEc: newTreeEc,
      lastMoisture: newTreeMoisture,
      lastTemp: 28.0,
      lastCrs: 25,
      lastMeasuredAt: Date.now(),
      notes: 'Thêm mới từ tab Xử Lý'
    };

    const allTrees = roomStorageService.getTreeLocations();
    const updatedAll = [...allTrees, newTreeObj];
    roomStorageService.saveTreeLocations(updatedAll);
    
    // Refresh local state & select new tree
    loadGardenTrees();
    setSelectedSpotId(newTreeId);
    setIsAddTreeModalOpen(false);
    setNewTreeName('');
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto w-full overflow-x-hidden">
      
      {/* 1. GARDEN SELECTOR & LOCATION HEADER */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-5 shadow-xs border-2 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 bg-emerald-100 text-[#2D7D46] rounded-2xl shrink-0">
              <Hammer className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                  Kế Hoạch Đất Vườn:
                </span>
                <h2 className="font-black text-base sm:text-xl text-slate-900 truncate">
                  {garden.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{garden.district}, {garden.province}</span>
                <span>•</span>
                <span>{garden.area} công ({garden.crop || 'Sầu riêng'})</span>
              </p>
            </div>
          </div>

          {/* Switch Garden Selector & Refresh Button */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {gardens.length > 1 && onSelectGarden && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                <span className="text-xs font-bold text-slate-500">Đổi vườn:</span>
                <select
                  value={garden.id}
                  onChange={(e) => onSelectGarden(e.target.value)}
                  className="text-xs font-black text-[#2D7D46] bg-transparent focus:outline-none cursor-pointer max-w-[140px] truncate"
                  title="Chọn vườn cần xem giải pháp"
                >
                  {gardens.map(g => (
                    <option key={g.id} value={g.id}>
                      🏡 {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={resetTasksToRecommended}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-all min-h-[40px] cursor-pointer"
              title="Tính toán lại giải pháp theo số đo mới nhất của đối tượng này"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Phân tích lại số đo</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. ENHANCED TREE SELECTOR WITH HORIZONTAL SLIDER BAR       */}
        {/* ========================================================= */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>📍 Vị trí đang phân tích:</span>
                  <strong className="text-[#2D7D46] text-sm">{activeLocationName}</strong>
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${currentEvaluation.badgeBg} ${currentEvaluation.badgeText}`}>
                  {currentEvaluation.badgeLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kéo thanh trượt qua trái/phải để chọn gốc cây cụ thể ({treeList.length} cây trong vườn)
              </p>
            </div>

            {/* Quick Filter Pills + Add Tree Button */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTreeFilter('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  treeFilter === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({treeStats.total})
              </button>
              <button
                onClick={() => setTreeFilter('safe')}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  treeFilter === 'safe' 
                    ? 'bg-emerald-700 text-white' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>🟢 Đất Tốt</span>
                <span>({treeStats.safeCount})</span>
              </button>
              {treeStats.warningCount > 0 && (
                <button
                  onClick={() => setTreeFilter('warning')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    treeFilter === 'warning' 
                      ? 'bg-amber-500 text-slate-950 font-black' 
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>🟡 Lưu Ý</span>
                  <span>({treeStats.warningCount})</span>
                </button>
              )}
              {treeStats.dangerCount > 0 && (
                <button
                  onClick={() => setTreeFilter('danger')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    treeFilter === 'danger' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <span>🔴 Cần Xử Lý</span>
                  <span>({treeStats.dangerCount})</span>
                </button>
              )}

              <button
                onClick={() => setIsAddTreeModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                title="Thêm cây sầu riêng mới vào vườn này"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Cây</span>
              </button>
            </div>
          </div>

          {/* Carousel Slider Wrapper with Left/Right arrows */}
          <div className="relative group">
            {/* Left Scroll Arrow */}
            <button
              onClick={() => scrollCarousel('left')}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              aria-label="Cuộn sang trái"
              title="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Track Container */}
            <div
              ref={carouselRef}
              className="flex items-center gap-2 overflow-x-auto py-2 px-1 scroll-smooth snap-x select-none"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#2D7D46 #e2e8f0'
              }}
            >
              {/* Option 1: Whole Garden */}
              <button
                onClick={() => setSelectedSpotId('all')}
                className={`min-w-[210px] sm:min-w-[230px] p-2.5 rounded-2xl font-bold shrink-0 transition-all text-left flex flex-col justify-between border-2 cursor-pointer snap-start ${
                  selectedSpotId === 'all'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 font-extrabold text-xs">
                    <span>🌐</span>
                    <span className="truncate">Toàn Vườn ({garden.name})</span>
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    selectedSpotId === 'all' ? 'bg-emerald-950/60 text-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Trung Bình ({gardenStats.totalTrees} cây)
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-mono">
                  <span>pH TB {gardenStats.avgPh.toFixed(1)}</span>
                  <span>•</span>
                  <span>EC TB {gardenStats.avgEc.toFixed(2)}</span>
                  <span>•</span>
                  <span>Ẩm TB {Math.round(gardenStats.avgMoisture)}%</span>
                </div>
                <div className="mt-1 text-[10px] opacity-80 font-medium truncate">
                  Dao động pH: {gardenStats.minPh.toFixed(1)} ➔ {gardenStats.maxPh.toFixed(1)}
                </div>
              </button>

              {/* Individual Trees */}
              {filteredTrees.map((t) => {
                const isSel = t.id === selectedSpotId;
                const ph = t.lastPh ?? garden.ph;
                const ec = t.lastEc ?? garden.ec;
                const moist = t.lastMoisture ?? garden.moisture;
                const ev = evaluateSoilLevel(ph, ec, moist);

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedSpotId(t.id)}
                    className={`min-w-[190px] sm:min-w-[210px] p-2.5 rounded-2xl font-bold shrink-0 transition-all text-left flex flex-col justify-between border-2 cursor-pointer snap-start ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-500/70 font-black'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TreeDeciduous className={`w-4 h-4 shrink-0 ${isSel ? 'text-slate-950' : 'text-emerald-700'}`} />
                        <span className="truncate text-xs font-black">{t.name}</span>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        ev.level === 'safe'
                          ? isSel ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-800'
                          : ev.level === 'warning'
                          ? isSel ? 'bg-amber-900 text-white' : 'bg-amber-100 text-amber-900'
                          : isSel ? 'bg-red-900 text-white' : 'bg-red-100 text-red-800'
                      }`}>
                        {ev.level === 'safe' ? 'Đất tốt 🟢' : ev.level === 'warning' ? 'Lưu ý 🟡' : 'Xử lý 🔴'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 mt-2 text-[11px] font-mono ${isSel ? 'text-slate-950' : 'text-slate-600'}`}>
                      <span>pH {ph.toFixed(1)}</span>
                      <span>•</span>
                      <span>EC {ec.toFixed(2)}</span>
                      <span>•</span>
                      <span>Ẩm {Math.round(moist)}%</span>
                    </div>
                  </button>
                );
              })}

              {/* Add Tree Button at the end of Carousel */}
              <button
                onClick={() => setIsAddTreeModalOpen(true)}
                className="min-w-[130px] p-2.5 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-bold shrink-0 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer snap-start min-h-[64px]"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-black">+ Thêm cây</span>
              </button>
            </div>

            {/* Right Scroll Arrow */}
            <button
              onClick={() => scrollCarousel('right')}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              aria-label="Cuộn sang phải"
              title="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. STEP 1 & 2: PHÂN TÍCH HIỆN TRẠNG & ĐÁNH GIÁ MỨC ĐỘ    */}
      {/* ========================================================= */}
      <div className={`rounded-3xl border-2 p-4 sm:p-5 shadow-xs space-y-4 bg-white ${
        currentEvaluation.level === 'danger'
          ? 'border-red-300'
          : currentEvaluation.level === 'warning'
          ? 'border-amber-300'
          : 'border-emerald-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              currentEvaluation.level === 'danger'
                ? 'bg-red-100 text-red-700'
                : currentEvaluation.level === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-[#2D7D46]'
            }`}>
              {currentEvaluation.level === 'safe' ? (
                <Sprout className="w-5 h-5" />
              ) : currentEvaluation.level === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Bước 1 & 2: Đo Đạc & Đánh Giá Mức Độ Đất
              </span>
              <h3 className="font-black text-base sm:text-lg text-slate-900">
                {currentEvaluation.headline}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`text-xs font-black px-3 py-1 rounded-full border ${currentEvaluation.badgeBg} ${currentEvaluation.badgeText}`}>
              {currentEvaluation.badgeLabel}
            </span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
              currentCrs >= 65 ? 'bg-red-600 text-white' : currentCrs >= 45 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-600 text-white'
            }`}>
              CRS: {currentCrs}/100
            </span>
          </div>
        </div>

        {/* 4 Sensor summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-slate-500 flex items-center gap-1 text-[11px] font-bold">
              <TestTube className="w-3.5 h-3.5 text-emerald-600" /> Độ chua pH
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {activePh.toFixed(2).replace('.', ',')}
            </p>
            <span className={`text-[10px] font-bold ${activePh >= 6.0 && activePh <= 6.8 ? 'text-emerald-700' : activePh < 5.5 ? 'text-red-700' : 'text-amber-700'}`}>
              {activePh >= 6.0 && activePh <= 6.8 ? 'Đạt chuẩn (5.8-6.5)' : activePh < 5.5 ? 'Quá chua gắt' : 'Hơi chua nhẹ'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-slate-500 flex items-center gap-1 text-[11px] font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Độ mặn EC
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {activeEc.toFixed(2).replace('.', ',')} <span className="text-xs font-normal">dS/m</span>
            </p>
            <span className={`text-[10px] font-bold ${activeEc <= 1.2 ? 'text-emerald-700' : activeEc > 2.0 ? 'text-red-700' : 'text-amber-700'}`}>
              {activeEc <= 1.2 ? 'An toàn (< 1.2)' : activeEc > 2.0 ? 'Nguy cơ mặn cao' : 'Dinh dưỡng hơi đậm'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-slate-500 flex items-center gap-1 text-[11px] font-bold">
              <Droplet className="w-3.5 h-3.5 text-blue-500" /> Độ ẩm đất
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {activeMoisture.toFixed(1).replace('.', ',')}%
            </p>
            <span className={`text-[10px] font-bold ${activeMoisture >= 60 && activeMoisture <= 75 ? 'text-emerald-700' : activeMoisture > 78 ? 'text-red-700' : 'text-amber-700'}`}>
              {activeMoisture >= 60 && activeMoisture <= 75 ? 'Độ ẩm chuẩn (60-75%)' : activeMoisture > 78 ? 'Đất ngập úng' : 'Hơi khô dưới chuẩn'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-slate-500 flex items-center gap-1 text-[11px] font-bold">
              Nhiệt độ rễ
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {activeTemp.toFixed(1).replace('.', ',')}°C
            </p>
            <span className={`text-[10px] font-bold ${activeTemp >= 25 && activeTemp <= 30 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {activeTemp >= 25 && activeTemp <= 30 ? 'Mát mẻ (25-30°C)' : 'Cần che phủ hạ nhiệt'}
            </span>
          </div>
        </div>

        {/* Evaluation Explanation Banner */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
          currentEvaluation.level === 'safe'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : currentEvaluation.level === 'warning'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-red-50/70 border-red-200 text-red-950'
        }`}>
          {currentEvaluation.level === 'safe' ? (
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : currentEvaluation.level === 'warning' ? (
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 flex-1">
            <p className="font-extrabold text-sm">
              {currentEvaluation.actionSubtitle}
            </p>
            <p className="font-medium opacity-90">
              {currentEvaluation.level === 'safe' ? (
                <span>
                  💡 <strong>Ghi chú kỹ thuật:</strong> Ở mức pH {activePh.toFixed(1)} và EC {activeEc.toFixed(2)} dS/m, các ion kim loại nặng (Cadimi) đều bị kết tủa bất động trong keo đất, rễ sầu riêng hoàn toàn an toàn. <strong>Không được bón vôi dồn dập</strong> lúc này kẻo làm kiềm hóa đất, hãy tập trung bồi dưỡng phân hữu cơ vi sinh để vùng đất ngày càng màu mỡ.
                </span>
              ) : currentEvaluation.level === 'warning' ? (
                <span>
                  ⚠️ <strong>Ghi chú kỹ thuật:</strong> Đất chớm lệch ngưỡng, rễ tơ bắt đầu hấp thụ dinh dưỡng chậm lại. Cần điều chỉnh nhẹ để ngăn chặn tiến triển xấu.
                </span>
              ) : (
                <span>
                  🚨 <strong>Ghi chú kỹ thuật:</strong> Mức độ vượt ngưỡng nguy hiểm. Khẩn trương xử lý theo các bước cấp bách bên dưới trước khi bón các loại phân khác.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Educational note: Toàn Vườn vs Từng Cây & Thang đo */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFaqGuide(!showFaqGuide)}
            className="w-full text-left text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center justify-between py-1 px-2 rounded-xl hover:bg-emerald-50/80 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>❓</span>
              <span>Giải đáp: "Toàn vườn là gì?" & "Tại sao không lấy cây thấp nhất áp đặt cho cả vườn?"</span>
            </span>
            <span className="text-xs text-emerald-700 font-bold">{showFaqGuide ? '▲ Thu gọn' : '▼ Xem chi tiết'}</span>
          </button>

          {showFaqGuide && (
            <div className="mt-2.5 p-3.5 bg-slate-50 border border-emerald-200 rounded-2xl text-xs space-y-2 text-slate-800 animate-in fade-in">
              <div className="flex items-start gap-2">
                <span className="text-base">1️⃣</span>
                <div>
                  <p className="font-black text-slate-900">"Toàn Vườn" là giá trị TRUNG BÌNH CỘNG của {gardenStats.totalTrees} cây đo được:</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Chỉ số toàn vườn (pH TB {gardenStats.avgPh.toFixed(1)}, EC TB {gardenStats.avgEc.toFixed(2)}) phản ánh sức khỏe tổng thể của mảnh vườn, giúp bà con lên kế hoạch tưới nước và bón phân hữu cơ định kỳ chung.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-base">2️⃣</span>
                <div>
                  <p className="font-black text-slate-900">Tại sao thang đo sinh lý chuẩn là pH 5.8 – 6.5?</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Mức pH 5.8 là ngưỡng tối thiểu để bộ rễ tơ sầu riêng hấp thụ được đạm, lân, kali và quan trọng nhất là <strong>ngăn chặn ion Cadimi tự do hòa tan</strong> thấm vào cây. Vì vậy, bất kể là trung bình vườn hay từng cây, nếu pH rơi xuống dưới 5.5 đều được cảnh báo 🔴 Cần can thiệp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-base">3️⃣</span>
                <div>
                  <p className="font-black text-slate-900">Tại sao KHÔNG lấy cây thấp nhất làm đại diện cho cả vườn?</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Độ phì đất quanh mỗi gốc cây là khác nhau (từ pH {gardenStats.minPh.toFixed(1)} đến {gardenStats.maxPh.toFixed(1)}). Nếu lấy cây thấp nhất ({gardenStats.lowestTreeName} - pH {gardenStats.minPh.toFixed(1)}) làm chuẩn rồi bón vôi đại trà toàn bộ vườn, những cây đang xanh tốt (pH 6.3 - 6.5) sẽ bị <strong>thừa vôi, kiềm hóa đất làm cháy rễ non</strong> và rất lãng phí chi phí.
                  </p>
                  <p className="text-emerald-900 font-bold mt-1 bg-emerald-100/60 p-2 rounded-xl border border-emerald-200">
                    👉 <strong>Nguyên tắc vàng:</strong> Dùng "Toàn Vườn" để nắm xu hướng chung. Khi phát hiện cây có pH thấp hoặc nhiễm mặn, bà con chỉ cần <strong>bấm chọn riêng cây đó trên thanh trượt để xử lý cục bộ ngay gốc cây đó</strong>!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. STEP 3: ACTION PLAN - BỒI DƯỠNG vs XỬ LÝ KHẨN CẤP     */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2D7D46]" />
              Bước 3: {currentEvaluation.actionTitle}
            </h3>
            <p className="text-[11px] text-slate-500">
              Áp dụng riêng cho: <strong>{activeLocationName}</strong> ({tasks.filter(t => t.completed).length}/{tasks.length} mục đã làm)
            </p>
          </div>

          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full self-start sm:self-auto border ${currentEvaluation.badgeBg} ${currentEvaluation.badgeText}`}>
            {currentEvaluation.isTreatmentRequired ? '🛠️ Cần can thiệp' : '🌿 Nuôi dưỡng & Phát triển'}
          </span>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`p-3.5 sm:p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-3 shadow-xs active:scale-[0.99] ${
                task.completed
                  ? 'bg-emerald-50/70 border-emerald-300 opacity-80'
                  : currentEvaluation.level === 'safe'
                  ? 'bg-white border-slate-200 hover:border-emerald-600'
                  : currentEvaluation.level === 'warning'
                  ? 'bg-white border-slate-200 hover:border-amber-500'
                  : 'bg-white border-slate-200 hover:border-red-500'
              }`}
            >
              {/* Checkbox */}
              <button 
                type="button"
                className="mt-0.5 text-[#2D7D46] shrink-0 min-h-[44px] flex items-center"
                aria-label={task.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành'}
              >
                {task.completed ? (
                  <CheckSquare className="w-6 h-6 text-[#2D7D46]" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400" />
                )}
              </button>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                    currentEvaluation.level === 'safe'
                      ? 'bg-emerald-800 text-white'
                      : currentEvaluation.level === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-red-700 text-white'
                  }`}>
                    Bước {idx + 1}
                  </span>
                  <h4 className={`text-sm sm:text-base font-extrabold ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {task.title}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <strong>Tại sao cần làm:</strong> {task.description}
                </p>

                <div className={`p-2.5 rounded-2xl border text-xs font-semibold ${
                  currentEvaluation.level === 'safe'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  🎯 <strong>Cách thực hiện cụ thể:</strong> {task.impact}
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

      {/* ========================================================= */}
      {/* 5. CALCULATOR: DƯỠNG CHẤT PHÁT TRIỂN vs VÔI KHẮC PHỤC     */}
      {/* ========================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
          <Calculator className="w-5 h-5 text-[#2D7D46]" />
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              {currentEvaluation.level === 'safe'
                ? `Bảng Tính Lượng Phân Hữu Cơ & Dưỡng Chất Nuôi Đất (${activeLocationName})`
                : `Công Cụ Tính Lượng Vôi Cần Bón Nâng pH (${activeLocationName})`}
            </h3>
            <p className="text-[11px] text-slate-500">
              Công thức tiêu chuẩn theo diện tích vườn ({areaCong} công) và loại thổ nhưỡng
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Farm Area */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Diện tích áp dụng (Số công / 1000m²):</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={areaCong}
              onChange={(e) => setAreaCong(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none"
            />
          </div>

          {/* Soil Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Chất đất hiện tại:</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none cursor-pointer"
            >
              <option value="loam">Đất thịt / Đất phù sa ven sông</option>
              <option value="clay">Đất sét nặng (Độ đệm cao)</option>
              <option value="sand">Đất cát pha / Đất giồng</option>
            </select>
          </div>

          {/* Lime or Organic selector */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              {currentEvaluation.level === 'safe' ? 'Loại hữu cơ khuyến nghị:' : 'Loại vôi dự định dùng:'}
            </label>
            {currentEvaluation.level === 'safe' ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl font-bold text-emerald-900">
                Phân chuồng hoai mục + Axit Humic
              </div>
            ) : (
              <select
                value={limeType}
                onChange={(e) => setLimeType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 font-bold text-slate-900 focus:border-[#2D7D46] outline-none cursor-pointer"
              >
                <option value="caco3">Vôi nông nghiệp CaCO3 (An toàn rễ non)</option>
                <option value="cao">Vôi nung CaO (Tác dụng nhanh hạ chua)</option>
                <option value="dolomite">Vôi Dolomite (Bổ sung Canxi & Magie)</option>
              </select>
            )}
          </div>
        </div>

        {/* Calculated Result Box */}
        {currentEvaluation.level === 'safe' ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-emerald-900 font-bold block">
                🌿 Đất đã đạt chuẩn pH {activePh.toFixed(1)}: Lượng vôi cần bón = <strong>0 kg</strong>
              </span>
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                <div>
                  <span className="text-xs text-slate-600 block">Phân chuồng hoai mục:</span>
                  <span className="text-xl sm:text-2xl font-black text-[#2D7D46]">
                    ~ {organicManureKg} kg
                  </span>
                </div>
                <span className="text-slate-400 font-bold">•</span>
                <div>
                  <span className="text-xs text-slate-600 block">Axit Humic kích rễ:</span>
                  <span className="text-xl sm:text-2xl font-black text-[#2D7D46]">
                    ~ {humicKg} kg
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              Cho {areaCong} công ({areaCong * 1000}m²)
            </span>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-amber-950 font-bold block">Ước tính lượng vôi cần bón nâng pH lên 6.0:</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-900">
                ~ {estimatedLimeKg} kg
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-900 bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200">
              Cho {areaCong} công ({areaCong * 1000}m²)
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-500 font-medium italic">
          * Khuyến nghị: Rải đều phân bón hoặc vôi theo đường kính tán lá sầu riêng ra ngoài mép rễ tơ, tưới nước ẩm sau khi bón.
        </p>
      </div>

      {/* 6. STRATEGY FOR LONG-TERM SOIL REGENERATION & SUSTAINABILITY */}
      <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-3xl text-slate-900 text-xs sm:text-sm space-y-2.5">
        <h4 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <span>Chiến Lược Cải Tạo & Nâng Cao Độ Phì Vùng Đất Sầu Riêng Bền Vững</span>
        </h4>
        <p className="text-slate-600 font-medium leading-relaxed">
          Đất trồng sầu riêng tại Đồng bằng Sông Cửu Long thường bị rửa trôi chất hữu cơ và nhiễm phèn chua theo mùa. Để duy trì năng suất cao và loại bỏ nguy cơ Cadimi dài hạn:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <strong className="text-emerald-800 block mb-0.5">1. Bồi đắp chất hữu cơ liên tục:</strong>
            Mỗi năm bổ sung ít nhất 2 cữ phân chuồng hoai mục (bò, dê, gà ủ trichoderma) giúp tăng độ tơi xốp và giữ dinh dưỡng.
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <strong className="text-emerald-800 block mb-0.5">2. Duy trì thảm cỏ giữ ẩm:</strong>
            Không dùng thuốc diệt cỏ làm trơ trọi đất. Giữ thảm cỏ xanh cao 10-15cm để rễ vi sinh phát triển và chống nứt nẻ mùa nắng.
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <strong className="text-emerald-800 block mb-0.5">3. Quản lý nước mương khoa học:</strong>
            Mùa mưa xả cống tránh ngập úng đáy mo; mùa khô kiểm tra độ mặn trước khi mở cống lấy nước vào mương.
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <strong className="text-emerald-800 block mb-0.5">4. Cân đối phân bón vô cơ:</strong>
            Hạn chế lạm dụng phân hóa học chứa gốc clo hoặc sunfat làm chai đất, ưu tiên phân bón lá hữu cơ vi lượng.
          </div>
        </div>
      </div>

      {/* 7. MODAL: ADD TREE DIRECTLY */}
      {isAddTreeModalOpen && (
        <div
          onClick={() => setIsAddTreeModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-[#2D7D46] rounded-xl font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    ➕ Thêm Cây Sầu Riêng Mới
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Vườn {garden.name} • Cây #{treeList.length + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTreeModalOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-full bg-slate-100 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTree} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên / Mã số cây *</label>
                <input
                  type="text"
                  required
                  placeholder={`Ví dụ: Cây Sầu #${treeList.length + 1}`}
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Giống cây</label>
                <select
                  value={newTreeVariety}
                  onChange={(e) => setNewTreeVariety(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                >
                  <option value="Sầu riêng Ri6">Sầu riêng Ri6</option>
                  <option value="Sầu riêng Monthong">Sầu riêng Monthong</option>
                  <option value="Sầu riêng Musang King">Sầu riêng Musang King</option>
                  <option value="Sầu riêng Black Thorn">Sầu riêng Black Thorn</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí trong vườn</label>
                <input
                  type="text"
                  value={newTreeLocation}
                  onChange={(e) => setNewTreeLocation(e.target.value)}
                  placeholder="Ví dụ: Góc 1 (Đầu liếp - Trái)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                />
              </div>

              {/* Initial Readings */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ chua pH</label>
                  <input
                    type="number"
                    step="0.1"
                    min="3.0"
                    max="9.0"
                    value={newTreePh}
                    onChange={(e) => setNewTreePh(parseFloat(e.target.value) || 6.0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ mặn EC</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="5.0"
                    value={newTreeEc}
                    onChange={(e) => setNewTreeEc(parseFloat(e.target.value) || 0.2)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ ẩm %</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    value={newTreeMoisture}
                    onChange={(e) => setNewTreeMoisture(parseFloat(e.target.value) || 70)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 text-center"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTreeModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Thêm Cây & Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

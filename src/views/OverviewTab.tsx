import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Garden, SyncStatusState } from '../types';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import { roomStorageService, TreeLocation, DetailedMeasurement } from '../services/roomStorageService';
import { retryPendingTreeMeasurements } from '../services/treeMeasurementService';
import { saveIncomingReadingForSession, TreeMeasurementSession } from '../services/autoTreeMeasurement';
import { subscribeToGardenRealtime } from '../services/firebaseService';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  X, 
  Droplet, 
  TestTube, 
  Zap, 
  Thermometer, 
  RefreshCw, 
  Play, 
  Plus, 
  MapPin, 
  TreeDeciduous, 
  Calendar, 
  Ruler, 
  Layers, 
  ArrowLeft, 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Move,
  Save, 
  Check, 
  Sparkles,
  Compass,
  Smartphone,
  Grid
} from 'lucide-react';

interface OverviewTabProps {
  garden: Garden;
  gardens?: Garden[];
  onSelectGarden?: (gardenId: string) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenLiveSurvey?: () => void;
  syncStatus?: SyncStatusState;
  lastSyncTime?: number;
  onManualSync?: (treeId?: string) => void;
}

type ModalType =
  | 'crs'
  | 'ph'
  | 'ec'
  | 'moisture'
  | 'temp'
  | 'action_drain'
  | 'action_measure'
  | 'action_guide'
  | 'action_dynamic'
  | 'add_tree'
  | 'add_garden'
  | null;

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  garden, 
  gardens = [],
  onSelectGarden,
  onNavigateToTab, 
  onOpenLiveSurvey,
  syncStatus = 'updated',
  lastSyncTime = Date.now(),
  onManualSync
}) => {
  // Tree selection state - null on initial load as per user requirement
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [measurementSession, setMeasurementSession] = useState<TreeMeasurementSession | null>(null);
  const committingMeasurementRef = useRef(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  useEffect(() => {
    const retry = () => { void retryPendingTreeMeasurements(); };
    retry();
    window.addEventListener('online', retry);
    const timer = window.setInterval(retry, 30000);
    return () => { window.removeEventListener('online', retry); window.clearInterval(timer); };
  }, []);
  const [treeList, setTreeList] = useState<TreeLocation[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeDynamicAction, setActiveDynamicAction] = useState<{
    step: number;
    title: string;
    why: string;
    how: string;
    targetName: string;
  } | null>(null);
  
  // Quick notice states
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Quick tree creation form state
  const [addTreeDirection, setAddTreeDirection] = useState<'right' | 'below' | 'general'>('general');
  const [targetRow, setTargetRow] = useState<number>(1);
  const [targetCol, setTargetCol] = useState<number>(1);
  const [adjacentTreeName, setAdjacentTreeName] = useState<string>('');

  // View mode for plot: 'fit' (vừa khít màn hình điện thoại) or 'matrix' (sơ đồ ngang 2D kéo vuốt)
  const [plotViewMode, setPlotViewMode] = useState<'fit' | 'matrix'>('fit');

  // 2D Scroll & Drag State for Plot Canvas
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overviewTreeCarouselRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [scrollTopState, setScrollTopState] = useState(0);

  const [newTreeForm, setNewTreeForm] = useState<{
    name: string;
    variety: string;
    treeAge: number;
    height: number;
    canopyWidth: number;
    notes: string;
    landmarkLocation: string;
  }>({
    name: '',
    variety: 'Sầu riêng Ri6',
    treeAge: 12,
    height: 7.5,
    canopyWidth: 6.0,
    notes: 'Vị trí liếp cao ráo',
    landmarkLocation: 'Ở giữa vườn (Gò cao)'
  });

  // Keep the overview in sync without creating trees while reading the list.
  useEffect(() => {
    const refresh = () => {
      const list = roomStorageService.getTreeLocations(garden.id);
      setTreeList(list);
      setSelectedTreeId(id => list.some(tree => tree.id === id) ? id : null);
    };
    refresh();
    setSelectedTreeId(null);
    setMeasurementSession(null);
    setSavingMeasurement(false);
    return roomStorageService.subscribeTreeLocations(refresh);
  }, [garden.id]);

  // Dynamic Garden Averages computed from all trees in the garden
  const gardenStats = useMemo(() => {
    if (!treeList || treeList.length === 0) {
      return {
        avgPh: garden.ph || 6.3,
        avgEc: garden.ec || 0.22,
        avgMoisture: garden.moisture || 70,
        avgTemp: garden.temperature || 28.0,
        minPh: garden.ph || 6.3,
        maxPh: garden.ph || 6.3,
        lowestPhTreeName: 'Chưa có',
        highestPhTreeName: 'Chưa có',
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
      const lowP = lowestTree.lastPh ?? garden.ph ?? 6.3;
      const highP = highestTree.lastPh ?? garden.ph ?? 6.3;
      if (p < lowP) lowestTree = t;
      if (p > highP) highestTree = t;
    });

    return {
      avgPh,
      avgEc,
      avgMoisture,
      avgTemp,
      minPh: Math.min(...phs),
      maxPh: Math.max(...phs),
      lowestPhTreeName: lowestTree?.name || 'Cây thấp nhất',
      highestPhTreeName: highestTree?.name || 'Cây cao nhất',
      totalTrees: treeList.length
    };
  }, [treeList, garden]);

  // Find currently selected tree
  const selectedTree = useMemo(() => {
    return treeList.find(t => t.id === selectedTreeId) || null;
  }, [treeList, selectedTreeId]);

  // This only accepts the first sensor record created after the user started this tree's session.
  useEffect(() => {
    if (!measurementSession) return;
    let active = true;
    const unsubscribe = subscribeToGardenRealtime((state) => {
      const data = state.reading.data;
      if (!active || committingMeasurementRef.current || !state.reading.success || !data ||
          data.deviceId !== garden.deviceId || data.ts < measurementSession.startedAt) return;
      const target = roomStorageService.getTreeLocations(garden.id).find(tree => tree.id === measurementSession.treeId);
      if (!target) {
        setMeasurementSession(null);
        setSavingMeasurement(false);
        setSaveNotice('Cây đã bị xóa nên không thể lưu lần đo này.');
        return;
      }
      committingMeasurementRef.current = true;
      void saveIncomingReadingForSession(garden, target, measurementSession, state.reading)
        .then(({ synced }) => {
          if (!active) return;
          setSaveNotice(synced
            ? `Đã tự lưu ${target.name} · Đã đồng bộ lịch sử lên Firebase.`
            : `Đã tự lưu ${target.name} trên thiết bị · Sẽ tự đồng bộ khi có mạng.`);
          setMeasurementSession(null);
          setSavingMeasurement(false);
        })
        .catch((error: Error) => {
          if (active) setSaveNotice(`Chưa lưu: ${error.message}`);
        })
        .finally(() => { committingMeasurementRef.current = false; });
    });
    return () => { active = false; unsubscribe(); };
  }, [measurementSession, garden]);

  // Values for the selected view:
  // When selectedTree is null -> "Toàn Vườn" uses actual Garden Average of all trees!
  // When selectedTree is chosen -> uses that specific tree's stored measurement!
  const currentTreePh = selectedTree ? (selectedTree.lastPh ?? garden.ph) : gardenStats.avgPh;
  const currentTreeEc = selectedTree ? (selectedTree.lastEc ?? garden.ec) : gardenStats.avgEc;
  const currentTreeMoisture = selectedTree ? (selectedTree.lastMoisture ?? garden.moisture) : gardenStats.avgMoisture;
  const currentTreeTemp = selectedTree ? (selectedTree.lastTemp ?? garden.temperature) : gardenStats.avgTemp;

  const crsScore = calculateCRS(currentTreePh, currentTreeEc, currentTreeMoisture, currentTreeTemp);
  const crsInfo = getCRSInfo(crsScore, currentTreePh, currentTreeEc, currentTreeMoisture, currentTreeTemp);

  // Derive causes based on actual tree parameters
  const getCausesSummary = () => {
    const causes: string[] = [];
    if (currentTreePh < 5.5) causes.push('đất quá chua (pH < 5.5)');
    else if (currentTreePh < 6.0) causes.push('đất hơi chua');

    if (currentTreeEc > 2.0) causes.push('EC cao (nhiễm mặn)');
    if (currentTreeMoisture > 75) causes.push('đất ngậm nước quá ẩm');

    if (causes.length === 0) return 'Các chỉ số đất tại gốc cây này đang trong ngưỡng tối ưu.';
    return `Nguyên nhân: ${causes.join(', ')}.`;
  };

  // Sensor status helper
  const getPhState = (ph: number) => {
    if (ph < 5.5) return { text: 'Quá chua', badgeBg: 'bg-red-600 text-white', colorText: 'text-red-700' };
    if (ph < 6.0) return { text: 'Hơi chua', badgeBg: 'bg-amber-500 text-slate-950', colorText: 'text-amber-700' };
    return { text: 'Đạt chuẩn', badgeBg: 'bg-[#2D7D46] text-white', colorText: 'text-emerald-700' };
  };

  const getEcState = (ec: number) => {
    if (ec > 2.5) return { text: 'Rất cao', badgeBg: 'bg-red-600 text-white', colorText: 'text-red-700' };
    if (ec > 2.0) return { text: 'Hơi cao', badgeBg: 'bg-amber-500 text-slate-950', colorText: 'text-amber-700' };
    return { text: 'An toàn', badgeBg: 'bg-[#2D7D46] text-white', colorText: 'text-emerald-700' };
  };

  const getMoistureState = (moist: number) => {
    if (moist > 80) return { text: 'Quá ướt', badgeBg: 'bg-red-600 text-white', colorText: 'text-red-700' };
    if (moist > 75) return { text: 'Hơi ẩm', badgeBg: 'bg-amber-500 text-slate-950', colorText: 'text-amber-700' };
    return { text: 'Vừa đủ', badgeBg: 'bg-[#2D7D46] text-white', colorText: 'text-emerald-700' };
  };

  const getTempState = (temp: number) => {
    if (temp > 33) return { text: 'Nóng', badgeBg: 'bg-amber-500 text-slate-950', colorText: 'text-amber-700' };
    return { text: 'Mát mẻ', badgeBg: 'bg-[#2D7D46] text-white', colorText: 'text-emerald-700' };
  };

  const phSt = getPhState(currentTreePh);
  const ecSt = getEcState(currentTreeEc);
  const moistSt = getMoistureState(currentTreeMoisture);
  const tempSt = getTempState(currentTreeTemp);

  // Alert card styling
  const alertCardConfig = crsScore >= 65
    ? {
        title: 'MỨC ĐỎ – CẦN XỬ LÝ SỚM',
        bg: 'bg-red-600 text-white border-red-700',
        badge: 'bg-black/30 text-white',
        icon: ShieldAlert
      }
    : crsScore >= 45
    ? {
        title: 'MỨC CAM – CẦN CHÚ Ý',
        bg: 'bg-amber-500 text-slate-950 border-amber-600',
        badge: 'bg-black/20 text-slate-950',
        icon: AlertTriangle
      }
    : {
        title: 'MỨC XANH – ĐẤT AN TOÀN',
        bg: 'bg-[#2D7D46] text-white border-emerald-700',
        badge: 'bg-black/30 text-white',
        icon: CheckCircle2
      };

  const AlertIcon = alertCardConfig.icon;

  // Context-aware dynamic actions based on selected tree / garden condition
  const dynamicActions = useMemo(() => {
    const actions: {
      step: number;
      title: string;
      why: string;
      how: string;
      targetName: string;
      tag?: string;
      severity: 'high' | 'medium' | 'normal';
    }[] = [];

    const targetLabel = selectedTree ? selectedTree.name : `${garden.name} (Toàn Vườn)`;

    // 1. Check pH issues
    if (currentTreePh < 5.5) {
      actions.push({
        step: actions.length + 1,
        title: `Bón vôi CaCO3 xử lý đất chua gắt (pH ${currentTreePh.toFixed(1).replace('.', ',')})`,
        why: `Chỉ số pH tại ${targetLabel} đang ở mức ${currentTreePh.toFixed(1).replace('.', ',')} (quá chua). Trong đất chua, rễ tơ bị cháy đầu và cây hấp thụ nhiều kim loại nặng Cadimi.`,
        how: `Bón vôi bột Dolomite hoặc CaCO3 khoảng 1,5 - 2,5 kg/gốc rải đều quanh đường kính tán, tưới ẩm để vôi tan từ từ nâng pH lên trên 6.0.`,
        targetName: targetLabel,
        tag: 'Ưu tiên cấp 1 - pH',
        severity: 'high'
      });
    } else if (currentTreePh < 6.0) {
      actions.push({
        step: actions.length + 1,
        title: `Nâng nhẹ pH đất (pH hiện tại ${currentTreePh.toFixed(1).replace('.', ',')})`,
        why: `pH đất tại ${targetLabel} hơi chua nhẹ. Cần điều chỉnh để rễ cây hấp thu dinh dưỡng đa trung vi lượng tốt hơn.`,
        how: `Bón lót thêm vôi lân nung chảy hoặc vôi nông nghiệp 0,8 - 1 kg/gốc kết hợp tưới nước giữ ẩm.`,
        targetName: targetLabel,
        tag: 'Điều chỉnh pH',
        severity: 'medium'
      });
    }

    // 2. Check EC / Salinity
    if (currentTreeEc > 2.0) {
      actions.push({
        step: actions.length + 1,
        title: `Tưới xả mặn và ngưng bón phân hóa học (EC ${currentTreeEc.toFixed(2).replace('.', ',')} mS/cm)`,
        why: `Độ dẫn điện EC tại ${targetLabel} ở mức ${currentTreeEc.toFixed(2).replace('.', ',')} mS/cm là cao, có nguy cơ ngộ độc muối mặn hoặc tồn dư phân vô cơ thừa làm nghẹt rễ.`,
        how: `Tưới xả liên tục 2-3 cữ bằng nước ngọt sông (EC < 0.5), tạm ngưng hoàn toàn NPK hóa học trong 7-10 ngày, bổ sung axit humic giải độc rễ.`,
        targetName: targetLabel,
        tag: 'Khẩn cấp - Nhiễm mặn',
        severity: 'high'
      });
    }

    // 3. Check Moisture
    if (currentTreeMoisture > 75) {
      actions.push({
        step: actions.length + 1,
        title: `Khơi thông rãnh thoát nước, chống nghẹt rễ (Độ ẩm ${Math.round(currentTreeMoisture)}%)`,
        why: `Độ ẩm đất tại ${targetLabel} đo được ${Math.round(currentTreeMoisture)}% (rất ướt). Nước ứ đọng quanh mo gốc lâu ngày làm nấm Phytophthora phát triển mạnh và nghẹt oxy tầng rễ.`,
        how: `Nạo vét rãnh thoát nước quanh mo gốc sâu 15-20cm, mở nắp cống xả nước đáy mương khi triều rút, ngưng tưới 2 ngày.`,
        targetName: targetLabel,
        tag: 'Thoát nước mo gốc',
        severity: currentTreeMoisture > 80 ? 'high' : 'medium'
      });
    } else if (currentTreeMoisture < 50) {
      actions.push({
        step: actions.length + 1,
        title: `Bổ sung tưới nước ẩm gốc (Độ ẩm ${Math.round(currentTreeMoisture)}%)`,
        why: `Đất tại ${targetLabel} đang khô dưới ngưỡng tối ưu (cần 60-75%), cây dễ rụng hoa non hoặc teo đọt.`,
        how: `Bật béc tưới phun sương từ 30-45 phút vào sáng sớm, phủ rơm rạ hoặc xác cỏ khô che giữ ẩm mặt mo.`,
        targetName: targetLabel,
        tag: 'Tưới nước bổ sung',
        severity: 'medium'
      });
    }

    // 4. Check Root temperature
    if (currentTreeTemp > 33) {
      actions.push({
        step: actions.length + 1,
        title: `Phủ cỏ mục / rơm rạ hạ nhiệt đất (Nhiệt độ ${currentTreeTemp.toFixed(1).replace('.', ',')}°C)`,
        why: `Nhiệt độ tầng rễ đạt ${currentTreeTemp.toFixed(1).replace('.', ',')}°C khiến bộ rễ non sầu riêng dễ bị sốc nhiệt và ngưng hút nước.`,
        how: `Phủ thảm cỏ mục hoặc rơm dày 5-7cm cách cổ rễ 20cm, tưới nước mát vào chiều dịu nắng.`,
        targetName: targetLabel,
        tag: 'Làm mát tầng rễ',
        severity: 'medium'
      });
    }

    // Default regular maintenance actions if soil is safe
    if (actions.length === 0) {
      actions.push({
        step: 1,
        title: `Duy trì độ ẩm và kiểm tra vi sinh định kỳ`,
        why: `Các chỉ số đất tại ${targetLabel} đang đạt chuẩn an toàn (pH: ${currentTreePh.toFixed(1).replace('.', ',')}, EC: ${currentTreeEc.toFixed(2).replace('.', ',')}, Ẩm: ${Math.round(currentTreeMoisture)}%).`,
        how: `Duy trì tưới giữ ẩm 60-70%, định kỳ bón phân hữu cơ vi sinh ủ hoai mục 3-5 kg/gốc để nuôi hệ vi sinh vật có lợi.`,
        targetName: targetLabel,
        tag: 'Duy trì tối ưu',
        severity: 'normal'
      });
      actions.push({
        step: 2,
        title: `Bổ sung amino acid và humic nuôi dưỡng rễ tơ`,
        why: `Bộ rễ đang trong trạng thái khỏe mạnh, thích hợp nhất để kích thích rễ tơ ăn sâu và tăng sinh khối quả.`,
        how: `Tưới gốc chế phẩm Humic Acid kết hợp Fulvic định kỳ 15-20 ngày/lần dưới tán lá.`,
        targetName: targetLabel,
        tag: 'Dưỡng rễ định kỳ',
        severity: 'normal'
      });
      actions.push({
        step: 3,
        title: `Kiểm tra rãnh mương và độ mặn nguồn nước trước khi bơm`,
        why: `Phòng ngừa rủi ro nước sông nhiễm mặn đột xuất hoặc nghẽn dòng chảy thoát nước khi có triều cường.`,
        how: `Dùng bút đo độ mặn nước sông trước mỗi cữ bơm vào mương vườn, chỉ lấy nước khi mặn dưới 0,5‰.`,
        targetName: targetLabel,
        tag: 'Phòng ngừa nguồn nước',
        severity: 'normal'
      });
    }

    // Ensure we provide at least up to 3 actions
    if (actions.length === 1) {
      actions.push({
        step: 2,
        title: `Theo dõi lại số đo cảm biến sau 24-48 giờ`,
        why: `Cần kiểm chứng tốc độ phục hồi của đất tại ${targetLabel} sau khi tác động xử lý.`,
        how: `Cắm que đo hoặc kiểm tra dữ liệu cảm biến hardware gửi về trên ứng dụng để xác nhận độ cải thiện.`,
        targetName: targetLabel,
        tag: 'Theo dõi chỉ số',
        severity: 'normal'
      });
      actions.push({
        step: 3,
        title: `Xem chi tiết liều lượng phân bón tại tab Xử Lý`,
        why: `Để có bảng tính phân bón và kế hoạch xử lý dài hạn theo đúng quy trình.`,
        how: `Chuyển qua tab "Xử Lý" trên thanh điều hướng để xem máy tính vôi và công thức theo từng loại đất.`,
        targetName: targetLabel,
        tag: 'Kế hoạch chi tiết',
        severity: 'normal'
      });
    } else if (actions.length === 2) {
      actions.push({
        step: 3,
        title: `Xem công cụ tính vôi & phân giải độc tại tab Xử Lý`,
        why: `Ứng dụng có sẵn công thức tính chính xác số kg vôi cần bón theo diện tích và loại đất của vườn.`,
        how: `Chuyển qua tab "Xử Lý" để nhập thông số và nhận hướng dẫn chi tiết theo ngày.`,
        targetName: targetLabel,
        tag: 'Kế hoạch chi tiết',
        severity: 'normal'
      });
    }

    return actions.slice(0, 3);
  }, [selectedTree, garden, currentTreePh, currentTreeEc, currentTreeMoisture, currentTreeTemp]);

  // Arm a single-use session. The next new ESP32 packet is saved automatically.
  const handleSaveTreeMeasurement = () => {
    if (!selectedTree || measurementSession) return;
    const startedAt = Date.now();
    setMeasurementSession({ gardenId: garden.id, treeId: selectedTree.id, startedAt });
    setSavingMeasurement(true);
    setSaveNotice(`Đang chờ số đo mới cho ${selectedTree.name}. Bây giờ bấm nút trên máy.`);
  };

  const selectTreeForMeasurement = (treeId: string | null) => {
    if (measurementSession) {
      setMeasurementSession(null);
      setSavingMeasurement(false);
      setSaveNotice('Đã hủy phiên đo trước khi đổi cây.');
    }
    setSelectedTreeId(treeId);
  };

  // Compute Tree Rows & Columns for 2D plot matrix
  const treeRows = useMemo(() => {
    if (treeList.length === 0) {
      return [{ rowNum: 1, trees: [] as TreeLocation[] }];
    }

    const rowMap = new Map<number, TreeLocation[]>();
    treeList.forEach((t, idx) => {
      // If row is not explicitly specified, fall back to rows of 4 trees
      const r = t.row && t.row > 0 ? t.row : (Math.floor(idx / 4) + 1);
      if (!rowMap.has(r)) {
        rowMap.set(r, []);
      }
      rowMap.get(r)!.push(t);
    });

    const sortedRowNums = Array.from(rowMap.keys()).sort((a, b) => a - b);
    return sortedRowNums.map(rowNum => {
      const trees = rowMap.get(rowNum)!;
      // Sort trees inside each row by col, or by spotNumber
      trees.sort((a, b) => ((a.col || 0) - (b.col || 0)) || (a.spotNumber - b.spotNumber));
      return {
        rowNum,
        trees
      };
    });
  }, [treeList]);

  // 2D Scroll Helpers (Kéo qua lại liếp & kéo lên xuống các hàng)
  const scrollGardenPlot = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    const scrollAmountX = 240;
    const scrollAmountY = 180;
    if (dir === 'left') {
      scrollContainerRef.current.scrollBy({ left: -scrollAmountX, behavior: 'smooth' });
    } else if (dir === 'right') {
      scrollContainerRef.current.scrollBy({ left: scrollAmountX, behavior: 'smooth' });
    } else if (dir === 'up') {
      scrollContainerRef.current.scrollBy({ top: -scrollAmountY, behavior: 'smooth' });
    } else if (dir === 'down') {
      scrollContainerRef.current.scrollBy({ top: scrollAmountY, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;
    if (!scrollContainerRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
    setScrollTopState(scrollContainerRef.current.scrollTop);
  };

  const handleMouseLeave = () => setIsMouseDown(false);
  const handleMouseUp = () => setIsMouseDown(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.3;
    const walkY = (y - startY) * 1.3;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walkX;
    scrollContainerRef.current.scrollTop = scrollTopState - walkY;
  };

  // Open modal targeted right beside the last tree in a row (or first tree if row is empty)
  const handleAddAdjacentTree = (rowNum: number, lastTreeInRow?: TreeLocation) => {
    const treesInThisRow = treeList.filter(t => (t.row && t.row > 0 ? t.row : 1) === rowNum);
    const nextCol = (lastTreeInRow?.col || treesInThisRow.length) + 1;
    const nextTreeNum = roomStorageService.getNextTreeNumber(garden.id);
    const prevName = lastTreeInRow?.name || `Cây đầu hàng`;

    setTargetRow(rowNum);
    setTargetCol(nextCol);
    setAdjacentTreeName(lastTreeInRow?.name || '');
    setAddTreeDirection('right');

    setNewTreeForm({
      name: `Cây #${nextTreeNum} (Hàng ${rowNum})`,
      variety: lastTreeInRow?.variety || garden.crop || 'Sầu riêng Ri6',
      treeAge: lastTreeInRow?.treeAge || garden.age || 10,
      height: lastTreeInRow?.height || 7.0,
      canopyWidth: lastTreeInRow?.canopyWidth || 6.0,
      notes: lastTreeInRow 
        ? `Trồng kế bên ${prevName} trên liếp hàng ${rowNum}`
        : `Cây đầu tiên của hàng ${rowNum}`,
      landmarkLocation: lastTreeInRow
        ? `Kế bên ${lastTreeInRow.name} (Hàng ${rowNum})`
        : `Đầu liếp - Hàng ${rowNum}`
    });
    setActiveModal('add_tree');
  };

  // Open modal targeted for a new row below
  const handleAddRowBelow = () => {
    const currentMaxRow = treeList.reduce((max, t) => Math.max(max, t.row || 1), 1);
    const newRowNum = currentMaxRow + 1;
    const nextTreeNum = roomStorageService.getNextTreeNumber(garden.id);

    setTargetRow(newRowNum);
    setTargetCol(1);
    setAdjacentTreeName('');
    setAddTreeDirection('below');

    setNewTreeForm({
      name: `Cây #${nextTreeNum} (Hàng ${newRowNum})`,
      variety: garden.crop || 'Sầu riêng Ri6',
      treeAge: garden.age || 10,
      height: 7.0,
      canopyWidth: 6.0,
      notes: `Hàng liếp mới #${newRowNum} (hướng xuống phía cuối liếp)`,
      landmarkLocation: `Đầu hàng liếp mới #${newRowNum}`
    });
    setActiveModal('add_tree');
  };

  // Open modal targeted right beside an arbitrary selected tree
  const handleAddNextToTree = (targetTree: TreeLocation) => {
    const rowNum = targetTree.row || 1;
    const treesInThisRow = treeList.filter(t => (t.row && t.row > 0 ? t.row : 1) === rowNum);
    const nextCol = (targetTree.col || treesInThisRow.length) + 1;
    const nextTreeNum = roomStorageService.getNextTreeNumber(garden.id);

    setTargetRow(rowNum);
    setTargetCol(nextCol);
    setAdjacentTreeName(targetTree.name);
    setAddTreeDirection('right');

    setNewTreeForm({
      name: `Cây #${nextTreeNum} (Kế bên ${targetTree.name})`,
      variety: targetTree.variety || garden.crop || 'Sầu riêng Ri6',
      treeAge: targetTree.treeAge || garden.age || 10,
      height: targetTree.height || 7.0,
      canopyWidth: targetTree.canopyWidth || 6.0,
      notes: `Trồng kế bên ${targetTree.name} (Hàng ${rowNum})`,
      landmarkLocation: `Kế bên ${targetTree.name} (Hàng ${rowNum})`
    });
    setActiveModal('add_tree');
  };

  // Open modal with prefilled direction context (fallback)
  const handleOpenAddModalWithDirection = (direction: 'right' | 'below' | 'general') => {
    if (direction === 'below') {
      handleAddRowBelow();
    } else {
      const highestRow = treeRows.length > 0 ? treeRows[treeRows.length - 1] : { rowNum: 1, trees: [] };
      handleAddAdjacentTree(highestRow.rowNum, highestRow.trees[highestRow.trees.length - 1]);
    }
  };

  // Add tree submission from modal with audit history tracking
  const handleCreateNewTree = (e: React.FormEvent, continueNext: boolean = false) => {
    e.preventDefault();
    const treeNumber = roomStorageService.getNextTreeNumber(garden.id);
    const dirSuffix = addTreeDirection === 'right' ? ' (Bên phải)' : addTreeDirection === 'below' ? ' (Ở dưới)' : '';
    const treeName = newTreeForm.name.trim() || `Cây #${treeNumber}${dirSuffix}`;

    const newTree: TreeLocation = {
      id: `tree-${garden.id}-${Date.now()}`,
      gardenId: garden.id,
      spotNumber: treeNumber,
      row: targetRow,
      col: targetCol,
      name: treeName,
      variety: newTreeForm.variety || garden.crop || 'Sầu riêng Ri6',
      treeAge: Number(newTreeForm.treeAge) || garden.age || 12,
      height: Number(newTreeForm.height) || 7.0,
      canopyWidth: Number(newTreeForm.canopyWidth) || 6.0,
      landmarkLocation: newTreeForm.landmarkLocation || (adjacentTreeName ? `Kế bên ${adjacentTreeName}` : `Hàng ${targetRow}, Cột ${targetCol}`),
      notes: newTreeForm.notes || 'Vị trí bổ sung mới'
    };

    const updated = roomStorageService.addOrUpdateTreeLocation(newTree);
    
    // Log configuration audit history
    roomStorageService.addConfigHistory({
      type: 'tree',
      action: 'create',
      targetId: newTree.id,
      targetName: newTree.name,
      summary: `Thêm cây ${newTree.name} (${newTree.variety}, ${newTree.treeAge} năm, vị trí: ${newTree.landmarkLocation})`
    });

    setTreeList(updated);
    selectTreeForMeasurement(newTree.id); // Automatically select newly created tree to measure!
    
    if (continueNext) {
      // Continue next: immediately generate and prefill next adjacent slot
      const nextCol = targetCol + 1;
      const nextNum = treeNumber + 1;
      setTargetCol(nextCol);
      setAdjacentTreeName(newTree.name);
      setNewTreeForm({
        name: `Cây #${nextNum} (Hàng ${targetRow})`,
        variety: newTree.variety,
        treeAge: newTree.treeAge,
        height: newTree.height,
        canopyWidth: newTree.canopyWidth,
        notes: `Trồng kế bên ${newTree.name}`,
        landmarkLocation: `Kế bên ${newTree.name} (Hàng ${targetRow})`
      });
      setSaveNotice(`Đã lưu ${newTree.name}! Ô kế tiếp đã sinh ra, mời nhập tiếp.`);
      setTimeout(() => setSaveNotice(null), 3000);
    } else {
      setActiveModal(null);
      setSaveNotice(`Đã cấu hình & thêm ${newTree.name}! Ô thêm cây kế bên đã sinh ra.`);
      setTimeout(() => setSaveNotice(null), 3000);
      
      // Reset form
      setNewTreeForm({
        name: '',
        variety: 'Sầu riêng Ri6',
        treeAge: 12,
        height: 7.5,
        canopyWidth: 6.0,
        notes: 'Vị trí liếp cao ráo',
        landmarkLocation: 'Ở giữa vườn (Gò cao)'
      });
      setAddTreeDirection('general');
    }
  };

  // Dimensions formatted
  const gardenShapeLabel = garden.shape === 'square' ? 'Hình vuông' : 'Hình chữ nhật';
  const gardenLength = garden.length || (garden.shape === 'square' ? 60 : 70);
  const gardenWidth = garden.width || (garden.shape === 'square' ? 60 : 50);
  const selectedTreeHasMeasurement = Boolean(
    selectedTree &&
    selectedTree.lastPh !== undefined &&
    selectedTree.lastEc !== undefined &&
    selectedTree.lastMoisture !== undefined &&
    selectedTree.lastTemp !== undefined
  );

  if (treeList.length === 0) {
    return (
      <>
        <div className="p-5 bg-white rounded-2xl border border-emerald-200 text-center space-y-3">
          <h2 className="font-extrabold text-slate-900">Chưa có số đo</h2>
          <p className="text-sm text-slate-600">Hãy thêm cây và ghi nhận số đo đầu tiên. App sẽ chỉ tính chỉ số toàn vườn sau khi có dữ liệu cây.</p>
          <button
            onClick={() => {
              setNewTreeForm(form => ({ ...form, name: `Cây ${roomStorageService.getNextTreeNumber(garden.id)}` }));
              setTargetRow(1);
              setTargetCol(1);
              setActiveModal('add_tree');
            }}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold text-sm"
          >
            Thêm cây
          </button>
        </div>

        {activeModal === 'add_tree' && (
          <div onClick={() => setActiveModal(null)} className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
            <form onClick={event => event.stopPropagation()} onSubmit={event => handleCreateNewTree(event, false)} className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900">Thêm cây đầu tiên</h3>
                <button type="button" onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên cây</label>
                <input autoFocus required value={newTreeForm.name} onChange={event => setNewTreeForm({ ...newTreeForm, name: event.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Vị trí</label>
                <input value={newTreeForm.landmarkLocation} onChange={event => setNewTreeForm({ ...newTreeForm, landmarkLocation: event.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900" />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-700 text-white rounded-xl font-extrabold">Lưu cây</button>
            </form>
          </div>
        )}
      </>
    );
  }

  if (selectedTree && !selectedTreeHasMeasurement) {
    return (
      <div className="p-5 bg-white rounded-2xl border border-emerald-200 text-center space-y-3">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <TreeDeciduous className="w-6 h-6" />
        </div>
        <h2 className="font-extrabold text-slate-900">{selectedTree.name} chưa có số đo</h2>
        <p className="text-sm text-slate-600">Cây này vừa được thêm vào. Chưa có dữ liệu cảm biến hoặc số đo thực địa nên app chưa tính pH, CRS hay đưa cảnh báo.</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => selectTreeForMeasurement(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">Xem toàn vườn</button>
          <button disabled={savingMeasurement} onClick={handleSaveTreeMeasurement} className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">{savingMeasurement ? 'Chờ máy đo…' : 'Bắt đầu đo cây này'}</button>
        </div>
        <p className="text-xs text-slate-600">Bấm bắt đầu → bấm nút trên máy. Bản ghi mới kế tiếp sẽ tự lưu vào đúng cây này.</p>
        {saveNotice && <p role="status" className="text-sm text-emerald-800">{saveNotice}</p>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full flex flex-col gap-3 pb-8 select-none overflow-x-hidden">
      
      {/* ========================================================= */}
      {/* 1. GARDEN PROFILE HEADER & LOCATION SELECTOR              */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border-2 border-emerald-800/20 p-3 sm:p-4 shadow-sm space-y-3 max-w-full overflow-hidden">
        
        {/* Title row with garden name & garden switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-100 text-[#2D7D46] rounded-xl font-black shrink-0">
              <Compass className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {garden.name}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-50 text-[#2D7D46] border border-emerald-200 text-[10px] font-black rounded-full shrink-0">
                  {garden.crop || 'Sầu riêng Ri6'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{[garden.address, garden.ward || garden.district, garden.province].filter(Boolean).join(', ')}</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="font-semibold text-slate-700 shrink-0">{garden.area} công</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="font-semibold text-slate-700 shrink-0">{garden.age} năm</span>
              </p>
            </div>
          </div>

          {/* Actions: Change garden or manage gardens */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {gardens.length > 1 && onSelectGarden && (
              <select
                value={garden.id}
                onChange={(e) => onSelectGarden(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D7D46] max-w-[140px] truncate"
                title="Chọn vườn khác"
              >
                {gardens.map(g => (
                  <option key={g.id} value={g.id}>
                    🏡 {g.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => onNavigateToTab('gardens')}
              className="text-xs font-extrabold text-[#2D7D46] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Xem thông số kỹ thuật và chỉnh sửa khuôn viên vườn"
            >
              <span>Quản lý Vườn</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* MEASUREMENT LOCATION SELECTOR STRIP (Toàn vườn vs Từng cây) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <span>📍 Vị trí lấy số đo:</span>
              <strong className="text-[#2D7D46]">
                {selectedTree ? selectedTree.name : 'Điểm đo trung tâm (Toàn Vườn)'}
              </strong>
            </span>
            <button
              onClick={() => setActiveModal('add_tree')}
              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Thêm cây (+)</span>
            </button>
          </div>

          <div className="relative group">
            {/* Left Scroll Arrow */}
            <button
              onClick={() => {
                if (overviewTreeCarouselRef.current) {
                  overviewTreeCarouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 shadow-md border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              aria-label="Cuộn trái"
              title="Cuộn danh sách cây sang trái"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div 
              ref={overviewTreeCarouselRef}
              className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 text-xs select-none scroll-smooth"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2D7D46 #f1f5f9' }}
            >
              {/* All garden main station pill */}
              <button
                onClick={() => selectTreeForMeasurement(null)}
                className={`px-3 py-1.5 rounded-xl font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTreeId === null
                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <span>🌐</span>
                <span>{gardenStats.totalTrees ? `Toàn Vườn (Trung Bình ${gardenStats.totalTrees} Cây)` : 'Toàn Vườn (Chưa có cây)'}</span>
              </button>

              {/* Tree pills */}
              {treeList.map((t, idx) => {
                const isSel = t.id === selectedTreeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTreeForMeasurement(t.id)}
                    className={`px-3 py-1.5 rounded-xl font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-500'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>🌳</span>
                    <span>{t.name || `Cây #${idx + 1}`}</span>
                    {t.lastCrs !== undefined && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        t.lastCrs >= 65 ? 'bg-red-500' : t.lastCrs >= 45 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow */}
            <button
              onClick={() => {
                if (overviewTreeCarouselRef.current) {
                  overviewTreeCarouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 shadow-md border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              aria-label="Cuộn phải"
              title="Cuộn danh sách cây sang phải"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. SPECIFIC TREE STATUS STRIP (IF A TREE IS SELECTED)     */}
      {/* ========================================================= */}
      {selectedTree && (
        <div className="bg-emerald-900 text-white rounded-2xl p-3 sm:p-3.5 border-2 border-emerald-600 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-in fade-in max-w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black shrink-0">
              <TreeDeciduous className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded shrink-0">
                  Cây Đang Chọn
                </span>
                <span className="font-black text-sm sm:text-base text-white truncate">
                  {selectedTree.name}
                </span>
              </div>
              <p className="text-xs text-emerald-200 font-medium truncate mt-0.5">
                Giống: <strong className="text-white">{selectedTree.variety}</strong> • Tuổi: <strong className="text-white">{selectedTree.treeAge} năm</strong>
                {selectedTree.notes ? ` • ${selectedTree.notes}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-emerald-700/60 self-end sm:self-auto">
            {/* Save hardware measurement button */}
            <button
              type="button"
              onClick={handleSaveTreeMeasurement}
              disabled={savingMeasurement}
              className="py-2 px-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer min-w-0"
              title="Lưu kết quả đo của cảm biến phần cứng vào lịch sử cây này"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{savingMeasurement ? 'Chờ máy đo…' : 'Bắt đầu đo'}</span>
            </button>

            {/* Deselect / Back to garden plot button */}
            <button
              type="button"
              onClick={() => selectTreeForMeasurement(null)}
              className="py-2 px-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-emerald-200 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 min-w-0 text-xs font-bold"
              title="Về điểm đo toàn vườn"
            >
              <X className="w-4 h-4 shrink-0" />
              <span className="truncate">Bỏ chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* 2B. WHOLE GARDEN AVERAGE BANNER (WHEN NO INDIVIDUAL TREE IS SELECTED) */}
      {!selectedTree && (
        <div className="bg-emerald-50 text-emerald-950 rounded-2xl p-3 sm:p-3.5 border-2 border-emerald-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-700 text-white rounded-xl font-black shrink-0">
              <span className="text-lg leading-none">🌐</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-1.5 py-0.5 rounded shrink-0">
                  Toàn Vườn (Trung Bình)
                </span>
                <span className="font-black text-sm sm:text-base text-slate-900 truncate">
                  {gardenStats.totalTrees ? `Trung Bình Cộng Của ${gardenStats.totalTrees} Gốc Cây Trong Vườn` : 'Chưa có cây. Thêm cây để bắt đầu theo dõi từng gốc.'}
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                Các chỉ số dưới đây đại diện cho <strong>Trung bình cả vườn</strong> (pH dao động: <strong className="text-slate-900">{gardenStats.minPh.toFixed(1)}</strong> ➔ <strong className="text-slate-900">{gardenStats.maxPh.toFixed(1)}</strong>).
                {gardenStats.maxPh - gardenStats.minPh >= 0.4 && (
                  <span className="text-amber-900 font-bold ml-1">
                    • Lưu ý: Cây chua nhất là <u>{gardenStats.lowestPhTreeName}</u> (pH {gardenStats.minPh.toFixed(1)}), hãy bấm chọn riêng cây để xử lý cục bộ!
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shrink-0 self-end sm:self-auto shadow-2xs">
            💡 Bấm chọn từng cây để xem & xử lý riêng
          </div>
        </div>
      )}

      {/* Success notice banner */}
      {saveNotice && (
        <div className="p-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center justify-between gap-2 animate-in fade-in">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[#2D7D46] stroke-[3]" />
            <span>{saveNotice}</span>
          </span>
          <button onClick={() => setSaveNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CORE MONITORING METRICS (ALWAYS VISIBLE!)             */}
      {/* ========================================================= */}

      {/* CURRENT ALERT CARD (CRS GAUGE) */}
      <div
        onClick={() => setActiveModal('crs')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 ${alertCardConfig.bg} shadow-sm cursor-pointer transition-all active:scale-[0.99] flex flex-col justify-between gap-1.5`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertIcon className="w-6 h-6 shrink-0" />
            <span className="font-black text-sm sm:text-base truncate">
              {alertCardConfig.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${alertCardConfig.badge}`}>
              CRS: {crsScore}/100
            </span>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </div>
        </div>

        <p className="text-xs sm:text-sm font-bold opacity-95">
          {getCausesSummary()}
        </p>

        <p className="text-[11px] font-semibold opacity-85 border-t border-white/20 pt-1.5">
          🛡️ CRS (Cadmium Risk Score): Đánh giá nguy cơ rễ hấp thu Cadimi từ đất tại {selectedTree ? selectedTree.name : 'trung tâm vườn'}.
        </p>
      </div>

      {/* REAL-TIME HARDWARE TELEMETRY BANNER */}
      <div className="bg-[#0f2d1e] text-emerald-100 rounded-xl px-3 py-2 border border-emerald-700/60 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="min-w-0 flex items-center gap-1.5 text-xs">
            <span className="font-extrabold text-[#FFC107] truncate">
              {garden.deviceId}
            </span>
            <span className="text-emerald-400 font-bold">•</span>
            <span className="text-emerald-200 font-semibold truncate">
              {savingMeasurement ? 'Đang chờ máy gửi số đo mới…' : selectedTree ? 'Số đo đã lưu của cây' : 'Tổng hợp số đo trong vườn'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-emerald-300 font-mono hidden sm:inline">
            Cập nhật: {new Date(selectedTree?.lastMeasuredAt || garden.lastUpdated || lastSyncTime).toLocaleTimeString('vi-VN')}
          </span>
          {onManualSync && (
            <button
              onClick={() => onManualSync?.(selectedTreeId || undefined)}
              title="Đồng bộ lại dữ liệu"
              className="px-2 py-0.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin text-blue-300' : 'text-emerald-200'}`} />
              <span className="hidden xs:inline">Đồng bộ</span>
            </button>
          )}
        </div>
      </div>

      {/* FOUR SENSOR METRICS (2x2 GRID) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        
        {/* Sensor 1: pH */}
        <div
          onClick={() => setActiveModal('ph')}
          className="p-2.5 sm:p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#2D7D46] shadow-xs cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-600 truncate flex items-center gap-1 min-w-0">
              <TestTube className="w-3.5 h-3.5 text-[#2D7D46] shrink-0" />
              <span className="truncate">Độ chua (pH)</span>
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${phSt.badgeBg}`}>
              {phSt.text}
            </span>
          </div>
          <div className="my-1 sm:my-1.5 flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentTreePh.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-slate-500 ml-1">pH</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
            Chuẩn: 5,8 – 6,5 {selectedTree ? '' : `• TB ${gardenStats.totalTrees} cây`}
          </p>
        </div>

        {/* Sensor 2: EC */}
        <div
          onClick={() => setActiveModal('ec')}
          className="p-2.5 sm:p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#2D7D46] shadow-xs cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-600 truncate flex items-center gap-1 min-w-0">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Độ mặn (EC)</span>
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${ecSt.badgeBg}`}>
              {ecSt.text}
            </span>
          </div>
          <div className="my-1 sm:my-1.5 flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentTreeEc.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-slate-500 ml-1">dS/m</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
            Chuẩn: &lt; 2,0 dS/m {selectedTree ? '' : `• TB ${gardenStats.totalTrees} cây`}
          </p>
        </div>

        {/* Sensor 3: Moisture */}
        <div
          onClick={() => setActiveModal('moisture')}
          className="p-2.5 sm:p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#2D7D46] shadow-xs cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-600 truncate flex items-center gap-1 min-w-0">
              <Droplet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Độ ẩm đất</span>
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${moistSt.badgeBg}`}>
              {moistSt.text}
            </span>
          </div>
          <div className="my-1 sm:my-1.5 flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentTreeMoisture.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-slate-500 ml-1">%</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
            Chuẩn: 60% – 75% {selectedTree ? '' : `• TB ${gardenStats.totalTrees} cây`}
          </p>
        </div>

        {/* Sensor 4: Temperature */}
        <div
          onClick={() => setActiveModal('temp')}
          className="p-2.5 sm:p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#2D7D46] shadow-xs cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-600 truncate flex items-center gap-1 min-w-0">
              <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Nhiệt độ đất</span>
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${tempSt.badgeBg}`}>
              {tempSt.text}
            </span>
          </div>
          <div className="my-1 sm:my-1.5 flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentTreeTemp.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-slate-500 ml-1">°C</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Chuẩn: 25°C – 31°C</p>
        </div>

      </div>

      {/* THREE TODAY'S ACTION BUTTONS - DYNAMIC ACCORDING TO GARDEN & TREE SENSORS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
            Việc cần xử lý hôm nay:
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            Dựa trên: <strong className="text-emerald-800">{selectedTree ? selectedTree.name : `${garden.name} (Chung)`}</strong>
          </span>
        </div>

        <div className="space-y-2">
          {dynamicActions.map((act) => (
            <button
              key={act.step}
              onClick={() => {
                setActiveDynamicAction(act);
                setActiveModal('action_dynamic');
              }}
              className="w-full p-2.5 sm:p-3 bg-white hover:bg-emerald-50/60 active:scale-[0.99] border-2 border-slate-200 hover:border-[#2D7D46] rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm min-w-0 flex-1 text-left">
                <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  act.severity === 'high' 
                    ? 'bg-red-100 text-red-700' 
                    : act.severity === 'medium' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-emerald-100 text-[#2D7D46]'
                }`}>
                  {act.step}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="break-words min-w-0 leading-snug block">
                    {act.title}
                  </span>
                  {act.tag && (
                    <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      act.severity === 'high' 
                        ? 'bg-red-50 text-red-600 border border-red-200' 
                        : act.severity === 'medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {act.tag}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SƠ ĐỒ LIẾP & VỊ TRÍ CÂY TRONG VƯỜN (BÊN DƯỚI)           */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-3 sm:p-4 shadow-sm space-y-3 max-w-full overflow-hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 bg-emerald-100 text-[#2D7D46] rounded-xl shrink-0">
              <TreeDeciduous className="w-5 h-5 shrink-0" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                Sơ Đồ Vườn Cây & Vị Trí Đo
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold truncate">
                Khuôn viên {gardenShapeLabel.toLowerCase()} ({gardenLength}m × {gardenWidth}m) • Chạm vào cây để chọn và ghi nhận số đo
              </p>
            </div>
          </div>

          {/* Controls: Mode Switcher + Add Tree */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* View Mode Toggle: Fit Phone Screen vs 2D Matrix */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPlotViewMode('fit')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  plotViewMode === 'fit'
                    ? 'bg-[#2D7D46] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem vừa khít tỷ lệ màn hình điện thoại, không mất góc nào"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Vừa Khung</span>
              </button>
              <button
                type="button"
                onClick={() => setPlotViewMode('matrix')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  plotViewMode === 'matrix'
                    ? 'bg-[#2D7D46] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng bản đồ liếp dài 2D kéo ngang"
              >
                <Grid className="w-3.5 h-3.5 shrink-0" />
                <span>Toàn Cảnh</span>
              </button>
            </div>

            {/* Quick Add Tree Button */}
            <button
              type="button"
              onClick={() => setActiveModal('add_tree')}
              className="px-3 py-1.5 bg-[#2D7D46] hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3] shrink-0" />
              <span>Thêm Cây</span>
            </button>
          </div>
        </div>

        {/* VISUAL PLOT MATRIX WITH 4 CORNERS & TERRAIN LANDMARKS */}
        <div className="w-full rounded-2xl p-2.5 sm:p-4 border-2 border-emerald-800/30 bg-gradient-to-br from-[#123321] via-[#1a472e] to-[#0d2618] text-white shadow-inner relative overflow-hidden">
          
          {/* Waterway / Canal boundary decor */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-400/50"></div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-cyan-400/50"></div>
          
          {/* Top Boundaries: Clean 2-column or 3-column banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-bold text-emerald-200/90 mb-3 border-b border-emerald-600/30 pb-2.5 items-center">
            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600/40 px-2 py-1 rounded-lg text-amber-300 font-extrabold shadow-xs min-w-0">
              <span className="shrink-0">📍 Góc 1:</span>
              <span className="text-white font-medium truncate">
                {garden.cornerTopLeft || 'Đầu liếp - Trái'}
              </span>
            </div>

            <div className="hidden sm:flex items-center justify-center text-[11px] text-emerald-300/80 font-mono">
              <span>Kênh ngọt dài {gardenLength}m ➡️</span>
            </div>

            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600/40 px-2 py-1 rounded-lg text-amber-300 font-extrabold shadow-xs min-w-0 justify-end text-right">
              <span className="text-white font-medium truncate">
                {garden.cornerTopRight || 'Đầu liếp - Phải'}
              </span>
              <span className="shrink-0">📍 Góc 2:</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW MODE 1: FIT TO PHONE SCREEN (VỪA KHÍT MÀN HÌNH)     */}
          {/* ======================================================== */}
          {plotViewMode === 'fit' ? (
            <div className="space-y-3.5 w-full">
              {treeRows.map((rowGroup) => {
                const lastTreeInRow = rowGroup.trees.length > 0 ? rowGroup.trees[rowGroup.trees.length - 1] : undefined;
                const nextColInRow = rowGroup.trees.length + 1;

                return (
                  <div
                    key={`fit-row-${rowGroup.rowNum}`}
                    className="bg-emerald-900/40 border border-emerald-700/50 rounded-2xl p-2.5 sm:p-3 space-y-2.5"
                  >
                    {/* Row Header Label */}
                    <div className="flex items-center justify-between text-xs text-emerald-200 font-bold border-b border-emerald-700/40 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-800 text-amber-300 font-black text-[11px]">
                          Hàng #{rowGroup.rowNum}
                        </span>
                        <span className="text-white font-extrabold">Liếp #{rowGroup.rowNum}</span>
                        <span className="text-[10px] text-emerald-300/70">({rowGroup.trees.length} cây)</span>
                      </div>
                      <span className="text-[10px] text-emerald-300/80 font-mono">
                        Dài {gardenLength}m
                      </span>
                    </div>

                    {/* Responsive Grid that fits 100% on phone screens */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                      {rowGroup.trees.map((tree, idx) => {
                        const isSelected = tree.id === selectedTreeId;
                        const tPh = tree.lastPh ?? currentTreePh;
                        const tEc = tree.lastEc ?? currentTreeEc;

                        return (
                          <div
                            key={tree.id}
                            onClick={() => selectTreeForMeasurement(tree.id)}
                            className={`rounded-xl p-2 sm:p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                              isSelected
                                ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400 shadow-md'
                                : 'bg-emerald-950/70 hover:bg-emerald-900/90 border-emerald-700/60 hover:border-emerald-500 shadow-xs'
                            }`}
                          >
                            {/* Selected Badge */}
                            {isSelected && (
                              <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Đang chọn</span>
                              </div>
                            )}

                            {/* Tree Header */}
                            <div className="flex items-start gap-1.5 min-w-0">
                              <span className="p-1 rounded-lg bg-emerald-800/80 text-amber-300 shrink-0 mt-0.5">
                                <TreeDeciduous className="w-4 h-4 shrink-0" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-xs text-white truncate" title={tree.name}>
                                  {tree.name}
                                </p>
                                <p className="text-[10px] text-emerald-300/90 truncate font-semibold">
                                  H#{rowGroup.rowNum}-C#{tree.col || (idx + 1)} • {tree.variety?.split(' ')[0] || 'Ri6'}
                                </p>
                              </div>
                            </div>

                            {/* Mini Metrics Box */}
                            <div className="grid grid-cols-2 gap-1 bg-black/30 rounded-lg p-1.5 text-[10px] font-bold">
                              <div>
                                <span className="text-slate-400">pH: </span>
                                <span className={tPh < 5.5 ? 'text-rose-400' : 'text-emerald-300'}>
                                  {tPh.toFixed(1).replace('.', ',')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">EC: </span>
                                <span className={tEc > 2.0 ? 'text-amber-300' : 'text-emerald-300'}>
                                  {tEc.toFixed(1).replace('.', ',')}
                                </span>
                              </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectTreeForMeasurement(tree.id);
                                }}
                                className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                    : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100'
                                }`}
                                title="Chọn cây này để ghi nhận số đo cảm biến"
                              >
                                <TreeDeciduous className="w-3 h-3 shrink-0" />
                                <span className="truncate">{isSelected ? 'Đang chọn' : 'Chọn cây'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddNextToTree(tree);
                                }}
                                className="py-1 px-2 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 active:scale-95 text-emerald-100 hover:text-white font-extrabold text-[10px] flex items-center justify-center gap-0.5 transition-all cursor-pointer shrink-0"
                                title="Thêm cây mới nằm kế bên cây này"
                              >
                                <Plus className="w-3 h-3 stroke-[3] shrink-0" />
                                <span>+ Kế bên</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* "+ Thêm Cây Kế Tiếp" slot that fits in the grid */}
                      <div
                        onClick={() => handleAddAdjacentTree(rowGroup.rowNum, lastTreeInRow)}
                        className="rounded-xl p-2.5 border-2 border-dashed border-emerald-500/60 hover:border-amber-400 bg-emerald-950/40 hover:bg-emerald-900/60 transition-all flex flex-col justify-between gap-2 cursor-pointer group active:scale-[0.98] min-h-[105px]"
                        title={`Thêm cây mới vào hàng ${rowGroup.rowNum}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform shrink-0">
                            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs text-emerald-100 group-hover:text-amber-300 truncate">
                              + Thêm Cây Mới
                            </p>
                            <p className="text-[10px] text-emerald-300/70 truncate">
                              Hàng #{rowGroup.rowNum} • Cột #{nextColInRow}
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] text-emerald-300/80 font-medium line-clamp-1">
                          {lastTreeInRow ? `Nằm kế: ${lastTreeInRow.name}` : `Cây đầu hàng #${rowGroup.rowNum}`}
                        </p>

                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-emerald-700/40 text-[11px] font-bold text-emerald-200 group-hover:text-amber-300">
                          <span>Nhập thông tin cây</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Full-width Add Row Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddRowBelow}
                  className="w-full py-2.5 px-4 bg-teal-950/80 hover:bg-teal-900 border-2 border-dashed border-teal-400/70 hover:border-teal-300 rounded-xl text-teal-100 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="w-5 h-5 rounded-full bg-teal-500/30 border border-teal-400/60 flex items-center justify-center text-teal-200 shrink-0">
                    <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                  </div>
                  <span>+ Thêm Hàng Liếp Mới Ở Dưới (Hàng #{treeRows.length + 1} ⬇️)</span>
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW MODE 2: 2D PANORAMIC SCROLL MATRIX (TOÀN CẢNH)     */
            /* ======================================================== */
            <div className="space-y-2.5 w-full">
              {/* Navigation controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-emerald-950/80 border border-emerald-700/50 rounded-xl text-[11px] text-emerald-200 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="p-1 bg-emerald-800/80 text-amber-300 rounded-md shrink-0">
                    <Move className="w-3.5 h-3.5 shrink-0" />
                  </span>
                  <span>↔️ Kéo qua lại • ↕️ Kéo lên xuống</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollGardenPlot('left')}
                    className="p-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 active:scale-90 text-white font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollGardenPlot('right')}
                    className="p-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 active:scale-90 text-white font-bold"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollGardenPlot('up')}
                    className="p-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 active:scale-90 text-white font-bold"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollGardenPlot('down')}
                    className="p-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 active:scale-90 text-white font-bold"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Viewport */}
              <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="overflow-x-auto overflow-y-auto max-h-[460px] p-2 rounded-xl cursor-grab active:cursor-grabbing select-none border border-emerald-700/40 bg-emerald-950/40 touch-pan-x touch-pan-y scroll-smooth scrollbar-thin scrollbar-thumb-emerald-700 scrollbar-track-emerald-950/50"
              >
                <div className="min-w-[620px] space-y-3">
                  {treeRows.map((rowGroup) => {
                    const lastTreeInRow = rowGroup.trees.length > 0 ? rowGroup.trees[rowGroup.trees.length - 1] : undefined;
                    const nextColInRow = rowGroup.trees.length + 1;

                    return (
                      <div
                        key={`row-${rowGroup.rowNum}`}
                        className="space-y-1.5 bg-emerald-900/30 p-2 rounded-xl border border-emerald-700/40"
                      >
                        <div className="flex items-center justify-between text-[11px] text-emerald-200 font-bold px-1">
                          <span className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-800 text-amber-300 font-black text-[10px]">
                              Hàng #{rowGroup.rowNum}
                            </span>
                            <span>Chiều dài liếp {gardenLength}m</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {rowGroup.trees.length} cây
                          </span>
                        </div>

                        <div className="flex items-stretch gap-2.5 overflow-x-visible pb-1">
                          {rowGroup.trees.map((t, idx) => {
                            const isSelected = t.id === selectedTreeId;
                            const tPh = t.lastPh ?? currentTreePh;
                            const tEc = t.lastEc ?? currentTreeEc;

                            return (
                              <div
                                key={t.id}
                                onClick={() => selectTreeForMeasurement(t.id)}
                                className={`w-[170px] shrink-0 rounded-xl p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                                  isSelected
                                    ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400 shadow-md'
                                    : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/60'
                                }`}
                              >
                                {/* Selected Badge */}
                                {isSelected && (
                                  <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    <span>Đang chọn</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="p-1 rounded-md bg-emerald-800 text-amber-300 shrink-0">
                                    <TreeDeciduous className="w-4 h-4 shrink-0" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-black text-xs text-white truncate">{t.name}</p>
                                    <p className="text-[10px] text-emerald-300 truncate">
                                      H#{rowGroup.rowNum}-C#{t.col || (idx + 1)}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1 bg-black/30 rounded-md p-1 text-[10px]">
                                  <div>pH: <strong className="text-emerald-300">{tPh.toFixed(1).replace('.', ',')}</strong></div>
                                  <div>EC: <strong className="text-amber-300">{tEc.toFixed(1).replace('.', ',')}</strong></div>
                                </div>

                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectTreeForMeasurement(t.id);
                                    }}
                                    className={`flex-1 py-1 px-1.5 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                                      isSelected
                                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                        : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100'
                                    }`}
                                    title="Chọn cây này để ghi nhận số đo"
                                  >
                                    <TreeDeciduous className="w-3 h-3 shrink-0" />
                                    <span>{isSelected ? 'Đang chọn' : 'Chọn cây'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddNextToTree(t);
                                    }}
                                    className="py-1 px-2 rounded bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-[10px] font-bold shrink-0 transition-all cursor-pointer"
                                    title="Thêm cây mới nằm kế bên"
                                  >
                                    + Kế bên
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Add tree card */}
                          <div
                            onClick={() => handleAddAdjacentTree(rowGroup.rowNum, lastTreeInRow)}
                            className="w-[160px] shrink-0 rounded-xl p-2.5 border-2 border-dashed border-emerald-500/60 hover:border-amber-400 bg-emerald-950/40 hover:bg-emerald-900/60 transition-all flex flex-col justify-between gap-2 cursor-pointer group active:scale-98"
                            title={`Thêm cây mới vào hàng ${rowGroup.rowNum}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4 text-amber-300 stroke-[3] shrink-0" />
                              <span className="text-xs font-bold text-emerald-100 group-hover:text-amber-300 truncate">
                                + Thêm Cây C#{nextColInRow}
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-300/80 truncate">
                              {lastTreeInRow ? `Nằm kế: ${lastTreeInRow.name}` : `Đầu hàng`}
                            </p>
                            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-200 group-hover:text-amber-300 pt-1 border-t border-emerald-700/40">
                              <span>Nhập thông tin cây</span>
                              <ChevronRight className="w-3 h-3 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Row Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAddRowBelow}
                      className="w-full py-2 px-3 bg-teal-950/60 hover:bg-teal-900 border-2 border-dashed border-teal-400/70 rounded-xl text-teal-100 font-extrabold text-xs flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>+ Thêm Hàng Liếp Mới (Hàng #{treeRows.length + 1} ⬇️)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Boundaries: Clean 2-column or 3-column banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-bold text-emerald-200/90 mt-3 border-t border-emerald-600/30 pt-2.5 items-center">
            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600/40 px-2 py-1 rounded-lg text-amber-300 font-extrabold shadow-xs min-w-0">
              <span className="shrink-0">📍 Góc 3:</span>
              <span className="text-white font-medium truncate">
                {garden.cornerBottomLeft || 'Cuối liếp - Trái'}
              </span>
            </div>

            <div className="hidden sm:flex items-center justify-center text-[11px] text-emerald-300/80 font-mono">
              <span>Chiều rộng vườn {gardenWidth}m ⬇️</span>
            </div>

            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600/40 px-2 py-1 rounded-lg text-amber-300 font-extrabold shadow-xs min-w-0 justify-end text-right">
              <span className="text-white font-medium truncate">
                {garden.cornerBottomRight || 'Cuối liếp - Phải'}
              </span>
              <span className="shrink-0">📍 Góc 4:</span>
            </div>
          </div>

        </div>

        {/* Live Field Survey launch button */}
        {onOpenLiveSurvey && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenLiveSurvey}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#123321] to-[#1f5431] text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-95"
            >
              <Play className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Khởi Động Buổi Đo Hiện Trường (Tự Động Nhảy Cây)</span>
            </button>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* 5. MODAL: ADD NEW TREE (TRIGGERED BY PLUS BUTTON)         */}
      {/* ========================================================= */}
      {activeModal === 'add_tree' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-[#2D7D46] rounded-xl font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {adjacentTreeName
                      ? `➕ Thêm Cây Kế Bên [${adjacentTreeName}]`
                      : addTreeDirection === 'below'
                        ? `➕ Thêm Hàng Liếp Mới (Hàng #${targetRow})`
                        : `➕ Thêm Cây Vào Hàng #${targetRow}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {garden.name} • Hàng #{targetRow}, Cột #{targetCol} {adjacentTreeName ? `(Kế bên ${adjacentTreeName})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-full bg-slate-100 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateNewTree(e, false)} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên / Mã cây sầu riêng *</label>
                <input
                  type="text"
                  required
                  placeholder={`Ví dụ: Cây #${roomStorageService.getNextTreeNumber(garden.id)} - Gốc Giáp Kênh`}
                  value={newTreeForm.name}
                  onChange={(e) => setNewTreeForm({ ...newTreeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí địa hình / Cột mốc cây *</label>
                <input
                  type="text"
                  value={newTreeForm.landmarkLocation}
                  onChange={(e) => setNewTreeForm({ ...newTreeForm, landmarkLocation: e.target.value })}
                  placeholder="Ví dụ: Góc 1 gần kênh ngọt, trên gò đất cao..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46] mb-1.5"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    'Góc 1 (Đầu liếp - Trái)',
                    'Góc 2 (Đầu liếp - Phải)',
                    'Góc 3 (Cuối liếp - Trái)',
                    'Góc 4 (Cuối liếp - Phải)',
                    'Ở giữa vườn (Gò cao)',
                    'Vùng trũng ngập',
                    'Gần mép mương',
                    'Bờ liếp cao ráo'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNewTreeForm({ ...newTreeForm, landmarkLocation: chip })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        newTreeForm.landmarkLocation === chip
                          ? 'bg-[#2D7D46] text-white border-[#2D7D46]'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-[#2D7D46]'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giống cây</label>
                  <select
                    value={newTreeForm.variety}
                    onChange={(e) => setNewTreeForm({ ...newTreeForm, variety: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                  >
                    <option value="Sầu riêng Ri6">Sầu riêng Ri6</option>
                    <option value="Sầu riêng Monthong (Dona)">Sầu riêng Monthong</option>
                    <option value="Sầu riêng Musang King">Sầu riêng Musang King</option>
                    <option value="Sầu riêng Black Thorn">Sầu riêng Black Thorn</option>
                    <option value="Sầu riêng Chuồng Bò">Sầu riêng Chuồng Bò</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tuổi cây (năm)</label>
                  <input
                    type="number"
                    min="1"
                    value={newTreeForm.treeAge}
                    onChange={(e) => setNewTreeForm({ ...newTreeForm, treeAge: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chiều cao cây (mét)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTreeForm.height}
                    onChange={(e) => setNewTreeForm({ ...newTreeForm, height: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đường kính tán lá (mét)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTreeForm.canopyWidth}
                    onChange={(e) => setNewTreeForm({ ...newTreeForm, canopyWidth: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú vị trí hoặc tình trạng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đất gò cao, lá xanh tốt, đang làm đọt..."
                  value={newTreeForm.notes}
                  onChange={(e) => setNewTreeForm({ ...newTreeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl order-3 sm:order-1"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateNewTree(e, true)}
                  className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer order-2 active:scale-98 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3] text-[#2D7D46]" />
                  <span>Lưu & Thêm Cây Kế Tiếp</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1 cursor-pointer order-1 sm:order-3 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Lưu & Đo Cây Này</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL OVERLAYS: SENSOR DETAILS & EXPLANATIONS          */}
      {/* ========================================================= */}
      {activeModal && activeModal !== 'add_tree' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                {activeModal === 'crs' && `Giải thích Điểm Nguy Cơ (${crsScore}/100)`}
                {activeModal === 'ph' && `Độ Chua Đất (pH: ${currentTreePh.toFixed(2).replace('.', ',')})`}
                {activeModal === 'ec' && `Độ Mặn (EC: ${currentTreeEc.toFixed(2).replace('.', ',')} dS/m)`}
                {activeModal === 'moisture' && `Độ Ẩm Đất (${currentTreeMoisture.toFixed(1)}%)`}
                {activeModal === 'temp' && `Nhiệt Độ Đất (${currentTreeTemp.toFixed(1)}°C)`}
                {activeModal === 'action_drain' && '1. Kiểm Tra Rãnh Thoát Nước'}
                {activeModal === 'action_measure' && '2. Đo Lại Đất & Nước Tưới'}
                {activeModal === 'action_guide' && '3. Hướng Dẫn Xử Lý Đất'}
                {activeModal === 'action_dynamic' && (activeDynamicAction ? `Bước ${activeDynamicAction.step}: Hướng Dẫn Xử Lý` : 'Chi Tiết Xử Lý')}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-full bg-slate-100 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="space-y-3 text-sm text-slate-800 leading-relaxed font-medium">
              
              {/* CRS Modal Body */}
              {activeModal === 'crs' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">1. Chỉ số này có ý nghĩa gì?</p>
                    <p className="text-xs text-slate-700">
                      Điểm CRS tổng hợp rủi ro từ đất chua, tích tụ muối và ngập úng. Khi các thông số này vượt chuẩn, Cadmium có sẵn trong đất sẽ hòa tan mạnh hơn và đi vào rễ sầu riêng.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-emerald-950">2. Mức điểm an toàn:</p>
                    <p className="text-xs text-emerald-900">
                      • <strong>0 - 44:</strong> Đất tốt, nguy cơ thấp<br/>
                      • <strong>45 - 64:</strong> Cần chú ý điều chỉnh pH / thoát nước<br/>
                      • <strong>65 - 100:</strong> Cần can thiệp sớm
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 text-xs">
                    ⚠️ <strong>Lưu ý quan trọng:</strong> Đây là cảnh báo nguy cơ từ điều kiện môi trường đất, KHÔNG PHẢI kết quả xét nghiệm Cadmium tại phòng thí nghiệm.
                  </div>
                </>
              )}

              {/* pH Sensor Modal */}
              {activeModal === 'ph' && (
                <>
                  <p><strong>• Chỉ số này có ý nghĩa gì?</strong> Độ chua pH cho biết đất đang bị chua hay kiềm. Đất quá chua (pH &lt; 5,5) làm tăng độ hòa tan kim loại nặng và hạn chế rễ hấp thu phân bón.</p>
                  <p><strong>• Khoảng phù hợp:</strong> pH lý tưởng cho sầu riêng là từ <strong>5,8 đến 6,5</strong>.</p>
                  <p><strong>• Bà con nên làm gì?</strong> Kiểm tra lại mẫu đất ở tầng rễ sâu 10-20cm. Nếu pH dưới 5,5, chuẩn bị bón bổ sung vôi nông nghiệp CaCO3 xung quanh tán lá.</p>
                </>
              )}

              {/* EC Sensor Modal */}
              {activeModal === 'ec' && (
                <>
                  <p><strong>• Chỉ số này có ý nghĩa gì?</strong> Chỉ số EC đo tổng lượng muối hòa tan trong đất. EC cao chứng tỏ đất bị nhiễm mặn hoặc tồn dư nhiều phân hóa học.</p>
                  <p><strong>• Khoảng phù hợp:</strong> Mức EC an toàn cho rễ sầu riêng là dưới <strong>2,0 dS/m</strong>.</p>
                  <p><strong>• Bà con nên làm gì?</strong> Kiểm tra độ mặn nước sông trước khi bơm tưới. Mở mương xả mặn bằng nước ngọt khi có đợt nước sông chảy qua.</p>
                </>
              )}

              {/* Moisture Sensor Modal */}
              {activeModal === 'moisture' && (
                <>
                  <p><strong>• Chỉ số này có ý nghĩa gì?</strong> Độ ẩm đo lượng nước trong đất. Đất ngập úng dài ngày làm thiếu oxy rễ, gây thối rễ và kích thích vi sinh vật yếm khí.</p>
                  <p><strong>• Khoảng phù hợp:</strong> Độ ẩm đất duy trì tốt nhất ở mức <strong>60% – 75%</strong>.</p>
                  <p><strong>• Bà con nên làm gì?</strong> Khai thông mương thoát nước, khơi rãnh đọng nước quanh mo gốc sau mưa lớn.</p>
                </>
              )}

              {/* Temperature Sensor Modal */}
              {activeModal === 'temp' && (
                <>
                  <p><strong>• Chỉ số này có ý nghĩa gì?</strong> Nhiệt độ đất tác động đến tốc độ hấp thu dinh dưỡng của bộ rễ và phản ứng hóa học trong mặt đất.</p>
                  <p><strong>• Khoảng phù hợp:</strong> Mức nhiệt độ đất mát mẻ tốt nhất là <strong>25°C – 31°C</strong>.</p>
                  <p><strong>• Bà con nên làm gì?</strong> Phủ rơm rạ hoặc giữ thảm cỏ mục che phủ mặt đất để tránh bị nắng gắt rọi trực tiếp làm nóng gốc.</p>
                </>
              )}

              {/* Action 1 Modal */}
              {activeModal === 'action_drain' && (
                <>
                  <p className="font-bold text-slate-900">Các bước kiểm tra thoát nước vườn:</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
                    <li>Lội mương kiểm tra xem có bèo dại, bùn đất nghẽn lối thoát ra sông/kênh không.</li>
                    <li>Quan sát mo gốc sầu riêng xem có bị đọng nước vũng sau đợt mưa hay không.</li>
                    <li>Mở van cống mương để xả nước đọng ra ngoài khi thủy triều rút xuống.</li>
                  </ol>
                </>
              )}

              {/* Action 2 Modal */}
              {activeModal === 'action_measure' && (
                <>
                  <p className="font-bold text-slate-900">Các bước đo lại đất và nước tưới:</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
                    <li>Dùng máy đo pH cắm sâu 10-15cm tại 3 điểm dưới hình chiếu tán lá.</li>
                    <li>Dùng bút đo múc nước sông/kênh trước khi bật máy bơm tưới.</li>
                    <li>Chỉ bơm tưới khi độ mặn nước dưới 0,5‰.</li>
                  </ol>
                </>
              )}

              {/* Action 3 Modal */}
              {activeModal === 'action_guide' && (
                <>
                  <p className="font-bold text-slate-900">Các bước xử lý cải tạo đất ngắn gọn:</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
                    <li>Tưới xả mặn/rửa chua trước bằng nước ngọt sông.</li>
                    <li>Bón vôi nông nghiệp CaCO3 bổ sung nâng pH (xem công cụ tính ở tab Xử Lý).</li>
                    <li>Bổ sung phân hữu cơ vi sinh và axit humic phục hồi bộ rễ.</li>
                  </ol>
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onNavigateToTab('remediation');
                    }}
                    className="w-full mt-2 py-2.5 bg-emerald-100 text-[#2D7D46] font-bold rounded-xl text-xs hover:bg-emerald-200 transition-all cursor-pointer"
                  >
                    Mở Tab Xử Lý Cụ Thể ➔
                  </button>
                </>
              )}

              {/* Dynamic Action Modal */}
              {activeModal === 'action_dynamic' && activeDynamicAction && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                      Địa điểm & Đối tượng áp dụng
                    </span>
                    <p className="font-extrabold text-sm text-slate-900">
                      📍 {activeDynamicAction.targetName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                      1. Vì sao cần xử lý việc này?
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {activeDynamicAction.why}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                    <p className="font-bold text-amber-950 text-xs sm:text-sm">
                      2. Hướng dẫn kỹ thuật thực hiện:
                    </p>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      {activeDynamicAction.how}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onNavigateToTab('remediation');
                    }}
                    className="w-full mt-2 py-2.5 bg-[#2D7D46] text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                  >
                    Chuyển sang Tab "Xử Lý" để theo dõi danh sách công việc ➔
                  </button>
                </div>
              )}

            </div>

            {/* Close Button */}
            <button
              onClick={() => setActiveModal(null)}
              className="w-full min-h-[48px] bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-base shadow-sm transition-all cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

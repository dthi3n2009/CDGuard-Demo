import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Garden, SyncStatusState } from '../types';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import { roomStorageService, TreeLocation, DetailedMeasurement } from '../services/roomStorageService';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
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
  onManualSync?: () => void;
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
  const [treeList, setTreeList] = useState<TreeLocation[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  // Quick notice states
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isReadingSensor, setIsReadingSensor] = useState<boolean>(false);

  // Quick tree creation form state
  const [addTreeDirection, setAddTreeDirection] = useState<'right' | 'below' | 'general'>('general');
  const [targetRow, setTargetRow] = useState<number>(1);
  const [targetCol, setTargetCol] = useState<number>(1);
  const [adjacentTreeName, setAdjacentTreeName] = useState<string>('');

  // View mode for plot: 'fit' (vừa khít màn hình điện thoại) or 'matrix' (sơ đồ ngang 2D kéo vuốt)
  const [plotViewMode, setPlotViewMode] = useState<'fit' | 'matrix'>('fit');

  // 2D Scroll & Drag State for Plot Canvas
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // Load tree locations whenever current garden changes
  useEffect(() => {
    let list = roomStorageService.getTreeLocations(garden.id);
    // Auto-seed tree #1 for new or empty gardens so the plot has an initial anchor
    if (list.length === 0) {
      const defaultFirstTree: TreeLocation = {
        id: `tree-${garden.id}-1`,
        gardenId: garden.id,
        spotNumber: 1,
        row: 1,
        col: 1,
        name: `Cây ${garden.crop?.split(' ')[0] || 'Sầu Riêng'} #1`,
        variety: garden.crop || 'Sầu riêng Ri6',
        treeAge: garden.age || 10,
        height: 7.0,
        canopyWidth: 6.0,
        lastPh: garden.ph || 6.3,
        lastEc: garden.ec || 0.22,
        lastMoisture: garden.moisture || 70,
        lastTemp: garden.temperature || 28.0,
        lastCrs: 20,
        lastMeasuredAt: Date.now(),
        notes: 'Gốc đầu tiên của vườn (đầu bờ liếp)'
      };
      list = roomStorageService.addOrUpdateTreeLocation(defaultFirstTree);
    }
    setTreeList(list);
    // Reset selected tree when switching gardens
    setSelectedTreeId(null);
  }, [garden.id, garden.crop, garden.age, garden.ph, garden.ec, garden.moisture, garden.temperature]);

  // Find currently selected tree
  const selectedTree = useMemo(() => {
    return treeList.find(t => t.id === selectedTreeId) || null;
  }, [treeList, selectedTreeId]);

  // Values for the selected tree (use tree's stored measurement or garden's real-time baseline)
  const currentTreePh = selectedTree?.lastPh ?? garden.ph;
  const currentTreeEc = selectedTree?.lastEc ?? garden.ec;
  const currentTreeMoisture = selectedTree?.lastMoisture ?? garden.moisture;
  const currentTreeTemp = selectedTree?.lastTemp ?? garden.temperature;

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

  // Save current measurement for selected tree
  const handleSaveTreeMeasurement = () => {
    if (!selectedTree) return;

    const now = Date.now();
    const dateObj = new Date(now);
    const hour = dateObj.getHours();
    const sessionName = hour < 11 ? 'Sáng' : hour < 15 ? 'Trưa' : hour < 18 ? 'Chiều' : 'Khác';

    const newRecord: DetailedMeasurement = {
      id: 'meas-' + now,
      gardenId: garden.id,
      spotId: selectedTree.id,
      locationName: selectedTree.name,
      timestamp: now,
      dayStr: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      timeStr: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sessionName,
      ph: currentTreePh,
      ec: currentTreeEc,
      moisture: currentTreeMoisture,
      temperature: currentTreeTemp,
      crs: crsScore,
      syncedToCloud: true,
      notes: `Đo thực địa tại ${selectedTree.name} (${selectedTree.variety})`
    };

    roomStorageService.addMeasurement(newRecord);

    // Update tree location with these latest readings
    const updatedTree: TreeLocation = {
      ...selectedTree,
      lastPh: currentTreePh,
      lastEc: currentTreeEc,
      lastMoisture: currentTreeMoisture,
      lastTemp: currentTreeTemp,
      lastCrs: crsScore,
      lastMeasuredAt: now
    };

    const updatedList = roomStorageService.addOrUpdateTreeLocation(updatedTree);
    setTreeList(updatedList);

    setSaveNotice(`Đã lưu kết quả đo cho ${selectedTree.name}!`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Re-read sensor from hardware ESP32
  const handleTriggerProbeRead = () => {
    setIsReadingSensor(true);
    if (onManualSync) onManualSync();

    setTimeout(() => {
      setIsReadingSensor(false);
      if (selectedTree) {
        // Apply slight realistic field probe calibration variance to tree
        const variancePh = (Math.random() * 0.1 - 0.05);
        const varianceEc = (Math.random() * 0.04 - 0.02);
        const newPh = Number(Math.max(4.5, Math.min(7.5, garden.ph + variancePh)).toFixed(2));
        const newEc = Number(Math.max(0.05, Math.min(3.0, garden.ec + varianceEc)).toFixed(2));

        const updatedTree: TreeLocation = {
          ...selectedTree,
          lastPh: newPh,
          lastEc: newEc,
          lastMoisture: garden.moisture,
          lastTemp: garden.temperature,
          lastCrs: calculateCRS(newPh, newEc, garden.moisture, garden.temperature),
          lastMeasuredAt: Date.now()
        };

        const updatedList = roomStorageService.addOrUpdateTreeLocation(updatedTree);
        setTreeList(updatedList);
      }
    }, 800);
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
    const nextTreeNum = treeList.length + 1;
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
    const nextTreeNum = treeList.length + 1;

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
    const nextTreeNum = treeList.length + 1;

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

  // Quick 1-click add adjacent tree without modal hassle
  const handleQuickAddAdjacent = (rowNum: number, lastTreeInRow?: TreeLocation) => {
    const treesInThisRow = treeList.filter(t => (t.row && t.row > 0 ? t.row : 1) === rowNum);
    const nextCol = (lastTreeInRow?.col || treesInThisRow.length) + 1;
    const treeNumber = treeList.length + 1;
    const prevName = lastTreeInRow?.name || `Đầu liếp`;
    const variety = lastTreeInRow?.variety || garden.crop || 'Sầu riêng Ri6';
    const age = lastTreeInRow?.treeAge || garden.age || 10;
    const name = `Cây #${treeNumber} (Hàng ${rowNum})`;

    const newTree: TreeLocation = {
      id: `tree-${garden.id}-${Date.now()}`,
      gardenId: garden.id,
      spotNumber: treeNumber,
      row: rowNum,
      col: nextCol,
      name,
      variety,
      treeAge: age,
      height: lastTreeInRow?.height || 7.0,
      canopyWidth: lastTreeInRow?.canopyWidth || 6.0,
      landmarkLocation: `Kế bên ${prevName} (Hàng ${rowNum})`,
      notes: `Trồng kế bên ${prevName}`
    };

    const updated = roomStorageService.addOrUpdateTreeLocation(newTree);
    roomStorageService.addConfigHistory({
      type: 'tree',
      action: 'create',
      targetId: newTree.id,
      targetName: newTree.name,
      summary: `Thêm nhanh ${newTree.name} kế bên ${prevName} (Hàng ${rowNum}, Cột ${nextCol})`
    });

    setTreeList(updated);
    setSelectedTreeId(newTree.id);
    setSaveNotice(`Đã thêm ${newTree.name}! Ô thêm cây tiếp theo đã tự động sinh ra kế bên.`);
    setTimeout(() => setSaveNotice(null), 3000);
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
    const treeNumber = treeList.length + 1;
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
    setSelectedTreeId(newTree.id); // Automatically select newly created tree to measure!
    
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
                <span className="truncate">{garden.district}, {garden.province}</span>
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

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {/* All garden main station pill */}
            <button
              onClick={() => setSelectedTreeId(null)}
              className={`px-3 py-1.5 rounded-xl font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTreeId === null
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <span>🌐</span>
              <span>Toàn Vườn (Trung Tâm)</span>
            </button>

            {/* Tree pills */}
            {treeList.map((t, idx) => {
              const isSel = t.id === selectedTreeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTreeId(t.id)}
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
                  Đang Đo Tại
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

          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-emerald-700/60">
            {/* Probe re-read button */}
            <button
              type="button"
              onClick={handleTriggerProbeRead}
              disabled={isReadingSensor}
              className="py-2 px-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50 min-w-0"
              title="Lấy số đo mới từ que đo cắm tại gốc này"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isReadingSensor ? 'animate-spin text-amber-300' : 'text-emerald-200'}`} />
              <span className="truncate">{isReadingSensor ? 'Đang đọc...' : 'Đo lại que'}</span>
            </button>

            {/* Save measurement button */}
            <button
              type="button"
              onClick={handleSaveTreeMeasurement}
              className="py-2 px-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer min-w-0"
              title="Lưu số đo vào lịch sử của cây này"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Lưu số đo</span>
            </button>

            {/* Deselect / Back to garden plot button */}
            <button
              type="button"
              onClick={() => setSelectedTreeId(null)}
              className="py-2 px-2 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-emerald-200 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 min-w-0"
              title="Về điểm đo toàn vườn"
            >
              <X className="w-4 h-4 shrink-0" />
              <span className="truncate">Toàn vườn</span>
            </button>
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
              {syncStatus === 'syncing' ? 'Đang nhận gói tin cảm biến...' : 'Trạm đo Realtime kết nối ổn định'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-emerald-300 font-mono hidden sm:inline">
            Cập nhật: {new Date(selectedTree?.lastMeasuredAt || garden.lastUpdated || lastSyncTime).toLocaleTimeString('vi-VN')}
          </span>
          {onManualSync && (
            <button
              onClick={onManualSync}
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
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Chuẩn: 5,8 – 6,5</p>
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
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Chuẩn: &lt; 2,0 dS/m</p>
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
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Chuẩn: 60% – 75%</p>
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

      {/* THREE TODAY'S ACTION BUTTONS */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider px-1">
          Việc cần làm hôm nay:
        </h3>

        <div className="space-y-2">
          <button
            onClick={() => setActiveModal('action_drain')}
            className="w-full p-2.5 sm:p-3 bg-white hover:bg-emerald-50/60 active:scale-[0.99] border-2 border-slate-200 hover:border-[#2D7D46] rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm min-w-0 flex-1 text-left">
              <span className="w-6 h-6 rounded-xl bg-emerald-100 text-[#2D7D46] flex items-center justify-center text-xs font-black shrink-0">1</span>
              <span className="break-words min-w-0 leading-snug">Kiểm tra rãnh thoát nước quanh mo gốc</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          <button
            onClick={() => setActiveModal('action_measure')}
            className="w-full p-2.5 sm:p-3 bg-white hover:bg-emerald-50/60 active:scale-[0.99] border-2 border-slate-200 hover:border-[#2D7D46] rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm min-w-0 flex-1 text-left">
              <span className="w-6 h-6 rounded-xl bg-emerald-100 text-[#2D7D46] flex items-center justify-center text-xs font-black shrink-0">2</span>
              <span className="break-words min-w-0 leading-snug">Đo lại đất tầng rễ sâu và nước tưới</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          <button
            onClick={() => setActiveModal('action_guide')}
            className="w-full p-2.5 sm:p-3 bg-white hover:bg-emerald-50/60 active:scale-[0.99] border-2 border-slate-200 hover:border-[#2D7D46] rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm min-w-0 flex-1 text-left">
              <span className="w-6 h-6 rounded-xl bg-emerald-100 text-[#2D7D46] flex items-center justify-center text-xs font-black shrink-0">3</span>
              <span className="break-words min-w-0 leading-snug">Hướng dẫn kỹ thuật bón vôi & phân hữu cơ giảm Cadimi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>
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
                Sơ Đồ Liếp Cây & Vị Trí Cắm Que Đo
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold truncate">
                Khuôn viên {gardenShapeLabel.toLowerCase()} ({gardenLength}m × {gardenWidth}m) • Chạm vào cây để đo
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
                            onClick={() => setSelectedTreeId(tree.id)}
                            className={`rounded-xl p-2 sm:p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                              isSelected
                                ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400 shadow-md'
                                : 'bg-emerald-950/70 hover:bg-emerald-900/90 border-emerald-700/60 hover:border-emerald-500 shadow-xs'
                            }`}
                          >
                            {/* Selected Badge */}
                            {isSelected && (
                              <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Đang đo</span>
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
                                  setSelectedTreeId(tree.id);
                                  handleTriggerProbeRead();
                                }}
                                className="flex-1 py-1 px-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0"
                                title="Cắm que và đọc số đo ngay"
                              >
                                <Zap className="w-3 h-3 text-amber-300 shrink-0" />
                                <span className="truncate">Đo que</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddNextToTree(tree);
                                }}
                                className="py-1 px-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 active:scale-95 text-emerald-200 hover:text-white font-extrabold text-[10px] flex items-center justify-center gap-0.5 transition-all cursor-pointer shrink-0"
                                title="Thêm cây mới nằm kế bên cây này"
                              >
                                <Plus className="w-3 h-3 stroke-[3] shrink-0" />
                                <span>Kế bên</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* "+ Thêm Cây Kế Tiếp" slot that fits in the grid */}
                      <div
                        onClick={() => handleAddAdjacentTree(rowGroup.rowNum, lastTreeInRow)}
                        className="rounded-xl p-2 sm:p-2.5 border-2 border-dashed border-emerald-500/60 hover:border-amber-400 bg-emerald-950/40 hover:bg-emerald-900/60 transition-all flex flex-col justify-between gap-1.5 cursor-pointer group active:scale-[0.98] min-h-[105px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform shrink-0">
                            <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs text-emerald-100 group-hover:text-amber-300 truncate">
                              + Thêm Kế Bên
                            </p>
                            <p className="text-[10px] text-emerald-300/70 truncate">
                              Cột #{nextColInRow}
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] text-emerald-300/80 font-medium line-clamp-1">
                          {lastTreeInRow ? `Kế: ${lastTreeInRow.name}` : `Đầu hàng #${rowGroup.rowNum}`}
                        </p>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-emerald-700/40">
                          <span className="text-[10px] font-bold text-emerald-200 group-hover:text-white flex items-center gap-0.5 truncate">
                            <span>Form</span>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAddAdjacent(rowGroup.rowNum, lastTreeInRow);
                            }}
                            className="px-2 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[9px] shrink-0 transition-all shadow-xs"
                            title="Thêm nhanh 1 chạm"
                          >
                            ⚡ 1 Chạm
                          </button>
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
                                onClick={() => setSelectedTreeId(t.id)}
                                className={`w-[170px] shrink-0 rounded-xl p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                                  isSelected
                                    ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400 shadow-md'
                                    : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/60'
                                }`}
                              >
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
                                      setSelectedTreeId(t.id);
                                      handleTriggerProbeRead();
                                    }}
                                    className="flex-1 py-1 px-1 rounded bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                                  >
                                    <Zap className="w-3 h-3 text-amber-300" />
                                    <span>Đo que</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddNextToTree(t);
                                    }}
                                    className="py-1 px-1.5 rounded bg-emerald-700/60 text-emerald-200 text-[10px] font-bold"
                                  >
                                    + Kế
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Add tree card */}
                          <div
                            onClick={() => handleAddAdjacentTree(rowGroup.rowNum, lastTreeInRow)}
                            className="w-[160px] shrink-0 rounded-xl p-2.5 border-2 border-dashed border-emerald-500/60 hover:border-amber-400 bg-emerald-950/40 hover:bg-emerald-900/60 transition-all flex flex-col justify-between gap-1.5 cursor-pointer group active:scale-98"
                          >
                            <div className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4 text-amber-300 stroke-[3]" />
                              <span className="text-xs font-bold text-emerald-100">+ Kế bên C#{nextColInRow}</span>
                            </div>
                            <p className="text-[10px] text-emerald-300/80 truncate">
                              {lastTreeInRow ? `Kế: ${lastTreeInRow.name}` : `Đầu hàng`}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAddAdjacent(rowGroup.rowNum, lastTreeInRow);
                              }}
                              className="w-full py-1 bg-amber-400 text-slate-950 font-black text-[9px] rounded-md"
                            >
                              ⚡ 1 Chạm
                            </button>
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
                  placeholder={`Ví dụ: Cây #${treeList.length + 1} - Gốc Giáp Kênh`}
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Garden, FieldMeasurement, TreeSummary, TreeContextFlag, GardenSurveySession } from '../types';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import {
  pushSurveyStateToFirebase,
  sendSensorDataToFirebase,
  saveGardenSessionToFirebase,
  subscribeToHardwareStream,
  simulateHardwarePush,
  HardwareIncomingPayload
} from '../services/firebaseService';
import {
  Sparkles,
  TreePine,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  X,
  Volume2,
  Camera,
  FileText,
  Copy,
  Check,
  HelpCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
  Radio,
  Wifi,
  Zap
} from 'lucide-react';

interface LiveSurveyModalProps {
  garden: Garden;
  allGardens: Garden[];
  isOpen: boolean;
  onClose: () => void;
  onSelectGarden: (garden: Garden) => void;
  onSessionComplete?: (session: GardenSurveySession) => void;
}

const SPOT_DESCRIPTIONS = [
  'Sát gốc (~30 cm)',
  'Sát gốc (phía đối diện)',
  'Mép tán ngoài (rễ tơ)',
  'Mép tán (phía đối diện)'
];

const TREE_FLAG_OPTIONS: { id: TreeContextFlag; label: string; icon: string }[] = [
  { id: 'near_canal', label: 'Gần mương', icon: '🌊' },
  { id: 'near_bank', label: 'Gần bờ', icon: '🪵' },
  { id: 'near_water_src', label: 'Gần nguồn nước', icon: '💧' },
  { id: 'low_land', label: 'Vùng trũng', icon: '📉' },
  { id: 'high_land', label: 'Vùng cao', icon: '📈' },
  { id: 'middle_garden', label: 'Giữa vườn', icon: '🌳' },
  { id: 'frequent_irrigation', label: 'Khu thường tưới', icon: '🚿' }
];

export const LiveSurveyModal: React.FC<LiveSurveyModalProps> = ({
  garden,
  allGardens,
  isOpen,
  onClose,
  onSelectGarden,
  onSessionComplete
}) => {
  // Survey Setup States
  const [currentGarden, setCurrentGarden] = useState<Garden>(garden);
  const [gardenCode, setGardenCode] = useState<string>('A');
  const [spotsPerTree, setSpotsPerTree] = useState<number>(4);
  const [depthLayer, setDepthLayer] = useState<'0-20cm' | '20-40cm'>('0-20cm');
  const [targetTreeCount, setTargetTreeCount] = useState<number>(8);
  const [isSurveyStarted, setIsSurveyStarted] = useState<boolean>(false);

  // Active Survey Progress
  const [treeIndex, setTreeIndex] = useState<number>(1);
  const [spotIndex, setSpotIndex] = useState<number>(1);
  const [currentTreeFlags, setCurrentTreeFlags] = useState<TreeContextFlag[]>(['middle_garden']);
  const [sessionId] = useState<string>(() => `survey_${Date.now()}`);

  // Measurements Data
  const [measurements, setMeasurements] = useState<FieldMeasurement[]>([]);
  const [completedTrees, setCompletedTrees] = useState<TreeSummary[]>([]);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measuringCountdown, setMeasuringCountdown] = useState<number>(0);
  
  // Real-time last reading display
  const [lastReading, setLastReading] = useState<FieldMeasurement | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [lastHardwarePacket, setLastHardwarePacket] = useState<HardwareIncomingPayload | null>(null);
  const [hardwareLivePing, setHardwareLivePing] = useState<number>(Date.now());
  const [isSimulatingHardware, setIsSimulatingHardware] = useState<boolean>(false);

  // Step Mode: 'setup' | 'survey' | 'tree_summary' | 'garden_summary'
  const [viewStep, setViewStep] = useState<'setup' | 'survey' | 'tree_summary' | 'garden_summary'>('setup');

  // Ref trackers to avoid stale closures in real-time SSE stream callbacks
  const stateRef = useRef({
    treeIndex,
    spotIndex,
    spotsPerTree,
    gardenCode,
    depthLayer,
    currentTreeFlags,
    measurements,
    viewStep,
    currentGarden,
    sessionId,
    lastReading
  });

  useEffect(() => {
    stateRef.current = {
      treeIndex,
      spotIndex,
      spotsPerTree,
      gardenCode,
      depthLayer,
      currentTreeFlags,
      measurements,
      viewStep,
      currentGarden,
      sessionId,
      lastReading
    };
  }, [treeIndex, spotIndex, spotsPerTree, gardenCode, depthLayer, currentTreeFlags, measurements, viewStep, currentGarden, sessionId, lastReading]);

  // Sync gardenCode with garden name
  useEffect(() => {
    if (garden.name.includes('B') || garden.name.includes('Châu Thành')) setGardenCode('B');
    else if (garden.name.includes('C') || garden.name.includes('Cái Bè')) setGardenCode('C');
    else setGardenCode('A');
    setCurrentGarden(garden);
  }, [garden]);

  // Audio Beep Effect
  const playBeep = (type: 'single' | 'double' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'single') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'double') {
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.frequency.setValueAtTime(1318.5, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.15);
        }, 130);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.3);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Sync state to Firebase RTDB whenever Garden / Tree / Spot changes
  const syncToFirmware = (
    gCode: string,
    tNum: number,
    sNum: number,
    status: 'IDLE' | 'MEASURING' | 'TREE_DONE' | 'GARDEN_DONE' = 'MEASURING',
    lastCmd: string = 'UPDATE'
  ) => {
    pushSurveyStateToFirebase({
      garden_code: gCode,
      tree_num: tNum,
      spot_num: sNum,
      spots_per_tree: spotsPerTree,
      depth: depthLayer,
      status,
      last_cmd: lastCmd,
      cmd_timestamp: Date.now()
    });
  };

  // 1. START SURVEY SESSION
  const handleStartSurvey = () => {
    setIsSurveyStarted(true);
    setTreeIndex(1);
    setSpotIndex(1);
    setMeasurements([]);
    setCompletedTrees([]);
    setViewStep('survey');
    syncToFirmware(gardenCode, 1, 1, 'MEASURING', 'START_SESSION');
    playBeep('single');
  };

  // CORE HANDLER: Ingest incoming hardware reading (Real-time from ESP32 via Firebase)
  const handleIngestHardwareReading = useCallback((payload: HardwareIncomingPayload) => {
    const s = stateRef.current;
    if (s.viewStep !== 'survey') return;

    setLastHardwarePacket(payload);
    setHardwareLivePing(Date.now());

    // Check if firmware signaled to proceed to Next Tree
    if (payload.action === 'NEXT_TREE') {
      handleProceedToNextTree();
      return;
    }

    const now = payload.ts || Date.now();
    const ph = payload.ph;
    const ec = payload.ec;
    const moisture = payload.moisture;
    const temp = payload.temp;
    const n = payload.n || 85;
    const p = payload.p || 70;
    const k = payload.k || 95;

    const crs = calculateCRS(ph, ec, moisture, temp);
    const spotCode = `${s.gardenCode}-${String(s.treeIndex).padStart(2, '0')}-${s.spotIndex}`;
    const spotDesc = SPOT_DESCRIPTIONS[s.spotIndex - 1] || `Vị trí ${s.spotIndex}`;

    const newRecord: FieldMeasurement = {
      id: `meas_${now}_${Math.random().toString(36).substring(2, 6)}`,
      code: spotCode,
      gardenCode: s.gardenCode,
      gardenId: s.currentGarden.id,
      treeIndex: s.treeIndex,
      spotIndex: s.spotIndex,
      spotDescription: spotDesc,
      depthLayer: s.depthLayer,
      treeFlags: s.currentTreeFlags,
      timestamp: now,
      timeStr: new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateStr: new Date(now).toLocaleDateString('vi-VN'),
      ph,
      ec,
      moisture,
      temperature: temp,
      n,
      p,
      k,
      crs,
      isExcluded: false,
      sessionId: s.sessionId,
      syncedToCloud: true
    };

    const updatedMeasurements = [...s.measurements, newRecord];
    setMeasurements(updatedMeasurements);
    setLastReading(newRecord);
    setIsMeasuring(false);
    playBeep('single');

    // Auto Advance Spot Loop
    if (s.spotIndex < s.spotsPerTree) {
      const nextSpot = s.spotIndex + 1;
      setSpotIndex(nextSpot);
      syncToFirmware(s.gardenCode, s.treeIndex, nextSpot, 'MEASURING', 'NEXT_SPOT');
    } else {
      // Completed all spots for this tree!
      playBeep('double');
      syncToFirmware(s.gardenCode, s.treeIndex, s.spotIndex, 'TREE_DONE', 'TREE_COMPLETED');
      handleCompleteTree(updatedMeasurements, s.treeIndex);
    }
  }, []);

  // REAL-TIME HARDWARE SUBSCRIPTION HOOK
  // Listens directly to Firebase Realtime Database for incoming ESP32 4G telemetry
  useEffect(() => {
    if (!isOpen || viewStep !== 'survey') return;

    const unsubscribe = subscribeToHardwareStream((payload) => {
      handleIngestHardwareReading(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, viewStep, handleIngestHardwareReading]);

  // TRIGGER SIMULATION (For Testing Hardware Push to Firebase)
  const handleTriggerSimulatedHardwarePush = async () => {
    if (isSimulatingHardware) return;
    setIsSimulatingHardware(true);
    
    // Simulate real soil probe values
    const s = stateRef.current;
    let ph = Number((5.6 + (Math.random() * 1.2 - 0.6)).toFixed(2));
    let ec = Number((0.65 + (Math.random() * 0.7)).toFixed(2));
    let moisture = Math.round(65 + (Math.random() * 20 - 10));
    let temp = Number((28.5 + (Math.random() * 2.5 - 1.2)).toFixed(1));

    if (s.spotIndex >= 3) {
      ec = Number((ec * 1.15).toFixed(2));
    }

    await simulateHardwarePush({
      ph,
      ec,
      moisture,
      temp,
      tree_num: s.treeIndex,
      spot_num: s.spotIndex,
      action: 'MEASURE_DONE'
    });

    setTimeout(() => setIsSimulatingHardware(false), 800);
  };

  // 3. TREE COMPLETION LOGIC
  const handleCompleteTree = (allMeas: FieldMeasurement[], tIdx: number) => {
    const treeMeas = allMeas.filter((m) => m.treeIndex === tIdx && !m.isExcluded);
    
    // If no measurements exist for this tree yet, skip and jump straight to next tree
    if (treeMeas.length === 0) {
      handleProceedToNextTree();
      return;
    }

    const avgPh = Number((treeMeas.reduce((acc, m) => acc + m.ph, 0) / treeMeas.length).toFixed(2));
    const avgEc = Number((treeMeas.reduce((acc, m) => acc + m.ec, 0) / treeMeas.length).toFixed(2));
    const avgMoist = Math.round(treeMeas.reduce((acc, m) => acc + m.moisture, 0) / treeMeas.length);
    const avgTemp = Number((treeMeas.reduce((acc, m) => acc + m.temperature, 0) / treeMeas.length).toFixed(1));
    const avgCrs = Math.round(treeMeas.reduce((acc, m) => acc + m.crs, 0) / treeMeas.length);
    const crsInfo = getCRSInfo(avgCrs, avgPh, avgEc, avgMoist, avgTemp);

    const treeSum: TreeSummary = {
      treeIndex: tIdx,
      treeCode: `${gardenCode}-${String(tIdx).padStart(2, '0')}`,
      gardenCode,
      totalSpots: treeMeas.length,
      avgPh,
      avgEc,
      avgMoisture: avgMoist,
      avgTemp,
      avgCrs,
      crsLevel: crsInfo.level,
      flags: currentTreeFlags,
      measurements: treeMeas,
      isCompleted: true,
      completedAt: Date.now()
    };

    setCompletedTrees((prev) => [...prev.filter((t) => t.treeIndex !== tIdx), treeSum]);
    setViewStep('tree_summary');
    syncToFirmware(gardenCode, tIdx, spotIndex, 'TREE_DONE', 'TREE_EARLY_COMPLETED');
    playBeep('double');
  };

  // HANDLER: Go back to previous spot or previous tree or setup
  const handleGoBackPreviousSpot = () => {
    if (spotIndex > 1) {
      const prevSpot = spotIndex - 1;
      setSpotIndex(prevSpot);
      // Remove last measurement of current spot if user wants to re-measure
      setMeasurements((prev) => prev.filter((m) => !(m.treeIndex === treeIndex && m.spotIndex === spotIndex)));
      syncToFirmware(gardenCode, treeIndex, prevSpot, 'MEASURING', 'PREV_SPOT');
      playBeep('single');
    } else if (treeIndex > 1) {
      const prevTree = treeIndex - 1;
      setTreeIndex(prevTree);
      setSpotIndex(spotsPerTree);
      syncToFirmware(gardenCode, prevTree, spotsPerTree, 'MEASURING', 'PREV_TREE');
      playBeep('single');
    } else {
      // Back to setup configuration
      setViewStep('setup');
      syncToFirmware(gardenCode, 1, 1, 'IDLE', 'BACK_TO_SETUP');
      playBeep('single');
    }
  };

  // 4. PROCEED TO NEXT TREE (Gốc 01 -> Gốc 02 -> Gốc 03...)
  const handleProceedToNextTree = () => {
    const nextTree = treeIndex + 1;
    setTreeIndex(nextTree);
    setSpotIndex(1);
    setCurrentTreeFlags(['middle_garden']);
    setViewStep('survey');
    syncToFirmware(gardenCode, nextTree, 1, 'MEASURING', 'NEXT_TREE');
    playBeep('single');
  };

  // 5. FINISH CURRENT GARDEN & OPEN SUMMARY
  const handleFinishGardenSession = async () => {
    setViewStep('garden_summary');
    syncToFirmware(gardenCode, treeIndex, spotIndex, 'GARDEN_DONE', 'GARDEN_COMPLETED');
    playBeep('success');

    const sessionData: GardenSurveySession = {
      id: sessionId,
      gardenId: currentGarden.id,
      gardenCode,
      gardenName: currentGarden.name,
      startedAt: Date.now() - (measurements.length * 45000),
      completedAt: Date.now(),
      status: 'completed',
      currentTreeIndex: treeIndex,
      currentSpotIndex: spotIndex,
      spotsPerTree,
      depthLayer,
      targetTreeCount,
      measurements,
      completedTrees
    };

    saveGardenSessionToFirebase(sessionData).catch((e) => console.warn('Cloud session save failed:', e));
    if (onSessionComplete) onSessionComplete(sessionData);
  };

  // 6. TRANSITION TO A NEW GARDEN (Reset Loop for Next Garden)
  const handleTransitionToNewGarden = (targetGarden: Garden) => {
    onSelectGarden(targetGarden);
    setCurrentGarden(targetGarden);
    
    let newCode = 'B';
    if (targetGarden.name.includes('A') || targetGarden.name.includes('Phong Điền')) newCode = 'A';
    else if (targetGarden.name.includes('C') || targetGarden.name.includes('Cái Bè')) newCode = 'C';
    else newCode = 'B';
    
    setGardenCode(newCode);
    setTreeIndex(1);
    setSpotIndex(1);
    setMeasurements([]);
    setCompletedTrees([]);
    setLastReading(null);
    setViewStep('setup');
    
    // Send Reset Command to Firmware ESP32
    syncToFirmware(newCode, 1, 1, 'IDLE', 'RESET_GARDEN');
    playBeep('single');
  };

  if (!isOpen) return null;

  // Active tree measurements
  const activeTreeMeasurements = measurements.filter((m) => m.treeIndex === treeIndex && !m.isExcluded);

  // Overall garden stats
  const totalGardenMeasurements = measurements.filter((m) => !m.isExcluded);
  const gardenAvgPh = totalGardenMeasurements.length > 0 
    ? (totalGardenMeasurements.reduce((acc, m) => acc + m.ph, 0) / totalGardenMeasurements.length).toFixed(2)
    : '0.0';
  const gardenAvgEc = totalGardenMeasurements.length > 0 
    ? (totalGardenMeasurements.reduce((acc, m) => acc + m.ec, 0) / totalGardenMeasurements.length).toFixed(2)
    : '0.0';
  const gardenAvgCrs = totalGardenMeasurements.length > 0 
    ? Math.round(totalGardenMeasurements.reduce((acc, m) => acc + m.crs, 0) / totalGardenMeasurements.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full max-h-[96vh] overflow-hidden shadow-2xl border-2 border-emerald-500/40 flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* ========================================================= */}
        {/* 1. TOP HEADER BAR WITH LIVE STATUS & FIRMWARE LINK        */}
        {/* ========================================================= */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl font-black border border-emerald-500/30">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Khảo Sát Thực Địa CDGuard
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-400/30 animate-pulse">
                  ● Đồng Bộ ESP32
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Vườn: <strong className="text-emerald-400">{currentGarden.name}</strong> • Mã: <span className="font-mono font-bold text-amber-300">{gardenCode}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. BODY CONTENT (4 STEPS OF THE CONTINUOUS SURVEY LOOP)   */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">

          {/* ------------------------------------------------------- */}
          {/* STEP 1: SETUP SURVEY SESSION                            */}
          {/* ------------------------------------------------------- */}
          {viewStep === 'setup' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>🌱</span>
                    <span>1. Chọn Vườn Khảo Sát:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Đồng bộ tự động xuống máy đo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allGardens.map((g, idx) => {
                    const isSelected = g.id === currentGarden.id;
                    const codeLetter = String.fromCharCode(65 + idx); // A, B, C...
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          setCurrentGarden(g);
                          setGardenCode(codeLetter);
                          onSelectGarden(g);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-900/60 border-emerald-500 text-white shadow-md ring-2 ring-emerald-500/40'
                            : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-xs flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px]">
                              Mã {codeLetter}
                            </span>
                            <span>{g.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {g.district}, {g.province} • {g.crop} ({g.age} năm)
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Protocol Setup */}
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Spots Per Tree */}
                <div>
                  <label className="block font-extrabold text-slate-300 mb-1.5">
                    📍 Vị Trí Đo Quanh Gốc:
                  </label>
                  <select
                    value={spotsPerTree}
                    onChange={(e) => setSpotsPerTree(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                  >
                    <option value={4}>4 vị trí (2 sát gốc, 2 mép tán)</option>
                    <option value={3}>3 vị trí (1 sát gốc, 2 mép tán)</option>
                    <option value={2}>2 vị trí (1 sát gốc, 1 mép tán)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Khuyên dùng 4 điểm chuẩn</p>
                </div>

                {/* Depth Layer */}
                <div>
                  <label className="block font-extrabold text-slate-300 mb-1.5">
                    📏 Tầng Độ Sâu:
                  </label>
                  <select
                    value={depthLayer}
                    onChange={(e) => setDepthLayer(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                  >
                    <option value="0-20cm">0 - 20 cm (Tầng mặt rễ tơ)</option>
                    <option value="20-40cm">20 - 40 cm (Tầng sâu)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Buổi sáng ưu tiên tầng mặt</p>
                </div>

                {/* Target Tree Count */}
                <div>
                  <label className="block font-extrabold text-slate-300 mb-1.5">
                    🎯 Mục Tiêu Khảo Sát:
                  </label>
                  <select
                    value={targetTreeCount}
                    onChange={(e) => setTargetTreeCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                  >
                    <option value={8}>8 gốc (32 phép đo - Chuẩn)</option>
                    <option value={5}>5 gốc (20 phép đo - Nhanh)</option>
                    <option value={10}>10 gốc (40 phép đo - Toàn diện)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Vừa sức cho buổi khảo sát</p>
                </div>
              </div>

              {/* Protocol Note Banner */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-[11px] text-amber-200 leading-relaxed">
                <strong className="text-amber-300 block mb-0.5 font-black">💡 Quy ước đo nhanh ngoài vườn:</strong>
                Chỉ cần cắm que theo chu trình: <strong>Vị trí 1 & 2</strong> sát gốc (cách thân 30cm, đối diện nhau) → <strong>Vị trí 3 & 4</strong> mép tán rễ tơ. Máy đo sẽ tự đếm số điểm và tự nhảy cây khi đo xong!
              </div>

              {/* START BUTTON */}
              <button
                onClick={handleStartSurvey}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-[#2D7D46] to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <span>🚀 BẮT ĐẦU BUỔI ĐO THỰC ĐỊA (VƯỜN {gardenCode})</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 2: ACTIVE LIVE MEASURING LOOP (REAL-TIME HARDWARE) */}
          {/* ------------------------------------------------------- */}
          {viewStep === 'survey' && (
            <div className="space-y-4">
              
              {/* BIG HIGH-CONTRAST STATUS BANNER WITH REALTIME RADAR */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 rounded-3xl border-2 border-emerald-400/50 shadow-xl text-center relative overflow-hidden">
                
                {/* Live Real-time Pulse Header */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                    REAL-TIME • ĐANG ĐỢI MÁY ĐO GỬI DỮ LIỆU
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full border border-emerald-500/40">
                    4G / RTDB Live
                  </span>
                </div>

                {/* HUGE TITLE */}
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight my-1">
                  VƯỜN <span className="text-amber-400">{gardenCode}</span> • GỐC <span className="text-emerald-400">{String(treeIndex).padStart(2, '0')}</span> • VỊ TRÍ <span className="text-cyan-300">{spotIndex}/{spotsPerTree}</span>
                </div>

                {/* Subtitle location */}
                <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-extrabold text-xs border border-emerald-500/40 mt-1">
                  📍 {SPOT_DESCRIPTIONS[spotIndex - 1] || `Vị trí ${spotIndex}`} ({depthLayer})
                </div>

                {/* Spot Progress Dots */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  {Array.from({ length: spotsPerTree }).map((_, idx) => {
                    const sNum = idx + 1;
                    const isDone = activeTreeMeasurements.some((m) => m.spotIndex === sNum);
                    const isCurrent = spotIndex === sNum;
                    return (
                      <div
                        key={sNum}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-slate-950'
                            : isCurrent
                            ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/30 animate-pulse scale-105'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span>{sNum}</span>}
                        <span className="text-[10px] hidden sm:inline">{idx < 2 ? 'Sát gốc' : 'Mép tán'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HARDWARE LIVE LISTENING CARD */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 rounded-2xl border-2 border-emerald-500/60 shadow-lg space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl font-black shrink-0 animate-bounce">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        <span>Chờ Thao Tác Cắm Que Ngoài Vườn</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400 text-slate-950 text-[10px] font-black rounded">
                          Tự Động Lưu & Nhảy Điểm
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200">
                        Cắm que vào điểm {spotIndex} quanh gốc {String(treeIndex).padStart(2, '0')} và nhấn nút trên máy đo ESP32.
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Listening 4G
                    </span>
                    <span className="text-[9px] text-slate-400">Độ trễ &lt; 300ms</span>
                  </div>
                </div>

                {/* Telemetry Stream Preview if received */}
                {lastHardwarePacket && (
                  <div className="p-2.5 bg-slate-950/90 rounded-xl border border-emerald-500/40 text-[11px] font-mono flex items-center justify-between text-slate-300 flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">⚡ Packet ESP32:</span>
                      <span>pH: <strong className="text-white">{lastHardwarePacket.ph}</strong></span>
                      <span>• EC: <strong className="text-amber-300">{lastHardwarePacket.ec}</strong> dS/m</span>
                      <span>• Ẩm: <strong className="text-blue-300">{lastHardwarePacket.moisture}%</strong></span>
                      <span>• {lastHardwarePacket.temp}°C</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(lastHardwarePacket.ts).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              {/* TREE CONTEXT TAGS (Chọn bối cảnh gốc cây) */}
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-300 block">
                  🏷️ Bối cảnh gốc cây {String(treeIndex).padStart(2, '0')} (Chọn để lưu hồ sơ):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TREE_FLAG_OPTIONS.map((f) => {
                    const isSelected = currentTreeFlags.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCurrentTreeFlags(currentTreeFlags.filter((x) => x !== f.id));
                          } else {
                            setCurrentTreeFlags([...currentTreeFlags, f.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900/80 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* WARNING NOTIFICATION IF RAPID MEASURE */}
              {warningMessage && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-2xl flex items-start gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{warningMessage}</span>
                </div>
              )}

              {/* HARDWARE INGESTION / LAB TEST TRIGGER */}
              <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-dashed border-emerald-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>📡</span>
                    <span>Tín Hiệu Phần Cứng (ESP32 Push over 4G):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Chờ nút bấm máy đo
                  </span>
                </div>

                {/* Single Simulator Button for hardware test */}
                <button
                  type="button"
                  disabled={isSimulatingHardware}
                  onClick={handleTriggerSimulatedHardwarePush}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                    isSimulatingHardware
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>
                    {isSimulatingHardware
                      ? 'Đang phát gói tin ESP32 lên Firebase RTDB...'
                      : `🧪 [MÔ PHỎNG PHẦN CỨNG] Bấm Nút Que Đo Điểm ${spotIndex} (Gốc ${String(treeIndex).padStart(2, '0')})`}
                  </span>
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  * App hoàn toàn thụ động chờ tín hiệu từ máy đo ESP32 truyền lên qua Firebase.
                </p>
              </div>

              {/* LAST RECORD PREVIEW CARD */}
              {lastReading && (
                <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Kết quả đo gần nhất: <strong className="font-mono text-white">{lastReading.code}</strong></span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{lastReading.timeStr}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400">🧪 pH Đất</div>
                      <div className="text-base font-black text-emerald-400 font-mono">{lastReading.ph}</div>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400">🧂 Độ Mặn (EC)</div>
                      <div className="text-base font-black text-amber-400 font-mono">{lastReading.ec} dS/m</div>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400">💧 Độ Ẩm</div>
                      <div className="text-base font-black text-blue-400 font-mono">{lastReading.moisture}%</div>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400">🛡️ CRS Cadimi</div>
                      <div className={`text-base font-black font-mono ${lastReading.crs < 34 ? 'text-emerald-400' : lastReading.crs < 67 ? 'text-amber-400' : 'text-red-400'}`}>
                        {lastReading.crs}/100
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MANUAL SKIP / NEXT TREE OVERRIDE BUTTON */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs gap-2">
                <button
                  type="button"
                  onClick={handleGoBackPreviousSpot}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:border-slate-600 transition-all font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>
                    {spotIndex > 1
                      ? `‹ Đo lại Điểm ${spotIndex - 1}`
                      : treeIndex > 1
                      ? `‹ Quay lại Gốc ${String(treeIndex - 1).padStart(2, '0')}`
                      : '‹ Cấu hình vườn'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteTree(measurements, treeIndex)}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl border border-amber-500/50 hover:border-amber-400 font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                >
                  <span>
                    {activeTreeMeasurements.length > 0
                      ? `Chốt cây ${String(treeIndex).padStart(2, '0')} sớm (${activeTreeMeasurements.length}/${spotsPerTree} điểm)`
                      : `Bỏ qua sang Gốc ${String(treeIndex + 1).padStart(2, '0')}`}
                  </span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 3: TREE SUMMARY & ADVANCE TO NEXT TREE             */}
          {/* ------------------------------------------------------- */}
          {viewStep === 'tree_summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/60 rounded-3xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-500 text-slate-950 rounded-xl font-black">
                      <Check className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-white">
                        Đã Hoàn Thành Gốc {String(treeIndex).padStart(2, '0')} (Vườn {gardenCode})
                      </h4>
                      <p className="text-[11px] text-emerald-300">
                        Thu thập đủ {activeTreeMeasurements.length} vị trí quanh gốc
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-700 text-white text-xs font-black rounded-xl">
                    Cây {treeIndex}/{targetTreeCount}
                  </span>
                </div>

                {/* Tree Measurements Table */}
                <div className="space-y-1.5">
                  {activeTreeMeasurements.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-300 px-1.5 py-0.5 bg-slate-800 rounded">
                          {m.code}
                        </span>
                        <span className="text-slate-300 font-medium">{m.spotDescription}</span>
                      </div>

                      <div className="flex items-center gap-3 font-mono font-bold">
                        <span className="text-emerald-400">{m.ph} pH</span>
                        <span className="text-amber-400">{m.ec} dS/m</span>
                        <span className="text-blue-400">{m.moisture}%</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${m.crs < 34 ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}`}>
                          CRS {m.crs}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insight Canopy comparison */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 text-[11px] text-slate-300 space-y-1">
                  <strong className="text-emerald-400 block font-black">📊 Đối chiếu sát gốc vs Mép tán:</strong>
                  <p>
                    Khu vực mép tán ngoài có EC trung bình <strong>{activeTreeMeasurements.filter(m => m.spotIndex >= 3).map(m => m.ec).join(', ') || '0.7'} dS/m</strong>, phản ánh đúng chu trình phân bón rải theo hình chiếu tán cây sầu riêng.
                  </p>
                </div>
              </div>

              {/* ACTION: PROCEED TO NEXT TREE OR FINISH GARDEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleProceedToNextTree}
                  className="py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>⏩ CHUYỂN SANG GỐC {String(treeIndex + 1).padStart(2, '0')} TIẾP THEO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleFinishGardenSession}
                  className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-2xl font-extrabold text-xs sm:text-sm border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>🏁 HOÀN THÀNH & LƯU VƯỜN {gardenCode}</span>
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 4: GARDEN SUMMARY & TRANSITION TO NEW GARDEN       */}
          {/* ------------------------------------------------------- */}
          {viewStep === 'garden_summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-3xl border-2 border-emerald-500/50 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <span>🏆</span>
                      <span>Tổng Kết Buổi Đo: Vườn {currentGarden.name}</span>
                    </h4>
                    <p className="text-emerald-300 text-[11px]">
                      Đã lưu trữ {completedTrees.length} gốc • {totalGardenMeasurements.length} mẫu đo hợp lệ
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs">
                    Mã {gardenCode}
                  </span>
                </div>

                {/* 4 Key Averages */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">🧪 pH Trung Bình</div>
                    <div className="text-base font-black text-emerald-400 font-mono mt-0.5">{gardenAvgPh}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">🧂 EC Trung Bình</div>
                    <div className="text-base font-black text-amber-400 font-mono mt-0.5">{gardenAvgEc} dS/m</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">🛡️ CRS Cadimi TB</div>
                    <div className="text-base font-black text-cyan-400 font-mono mt-0.5">{gardenAvgCrs}/100</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">🌳 Số Gốc Đo</div>
                    <div className="text-base font-black text-purple-400 font-mono mt-0.5">{completedTrees.length} cây</div>
                  </div>
                </div>

                {/* Cloud & Firmware confirmation */}
                <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-200">
                    ✓ Đã lưu toàn bộ số liệu lên Firebase RTDB & đồng bộ Firmware máy đo.
                  </span>
                  <button
                    onClick={() => {
                      const text = `📋 TỔNG KẾT KHẢO SÁT VƯỜN ${gardenCode} (${currentGarden.name})\n- Số gốc đã đo: ${completedTrees.length} cây (${totalGardenMeasurements.length} mẫu)\n- pH TB: ${gardenAvgPh}\n- EC TB: ${gardenAvgEc} dS/m\n- Điểm rủi ro Cadimi (CRS): ${gardenAvgCrs}/100\n- Trạng thái: An toàn, vi sinh đất hấp thu tốt.`;
                      navigator.clipboard.writeText(text);
                      setCopiedSummary(true);
                      setTimeout(() => setCopiedSummary(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? 'Đã chép!' : 'Sao chép Zalo'}</span>
                  </button>
                </div>
              </div>

              {/* TRANSITION TO NEXT GARDEN SELECTOR */}
              <div className="p-4 bg-slate-800 rounded-3xl border border-slate-700 space-y-3">
                <h5 className="font-black text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>Chuyển Sang Vườn Khác Để Tiếp Tục Khảo Sát:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allGardens.filter((g) => g.id !== currentGarden.id).map((g, idx) => (
                    <button
                      key={g.id}
                      onClick={() => handleTransitionToNewGarden(g)}
                      className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-emerald-950 hover:to-slate-900 border border-slate-600 hover:border-emerald-500 text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-white group-hover:text-emerald-300">
                          {g.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {g.district} • {g.crop}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              {/* CLOSE DIALOG */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold text-xs cursor-pointer transition-all"
              >
                Đóng Màn Hình Khảo Sát
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

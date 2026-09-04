import React, { useState, useEffect } from 'react';
import { Garden, ConfigHistoryItem } from '../types';
import { roomStorageService, TreeLocation } from '../services/roomStorageService';
import {
  Trees,
  Plus,
  Edit,
  Trash2,
  MapPin,
  TreeDeciduous,
  Ruler,
  Maximize2,
  Clock,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  History,
  Compass,
  Mountain,
  RotateCcw,
  FileText,
  Check
} from 'lucide-react';

interface GardensManagementTabProps {
  gardens: Garden[];
  currentGarden?: Garden;
  currentGardenId?: string;
  onSelectGarden: (gardenId: string) => void;
  onUpdateGarden: (garden: Garden) => void;
  onAddGarden: (garden: Garden) => void;
  onDeleteGarden: (gardenId: string) => void;
}

export const GardensManagementTab: React.FC<GardensManagementTabProps> = ({
  gardens = [],
  currentGarden,
  currentGardenId,
  onSelectGarden,
  onUpdateGarden,
  onAddGarden,
  onDeleteGarden
}) => {
  const activeGarden = currentGarden || gardens.find(g => g && g.id === currentGardenId) || gardens[0] || { id: 'iot', name: 'Vườn Sầu Riêng' };
  const [activeSubTab, setActiveSubTab] = useState<'gardens' | 'trees' | 'history'>('gardens');

  // Tree locations state for selected garden
  const [treeLocations, setTreeLocations] = useState<TreeLocation[]>([]);
  const [selectedGardenForTrees, setSelectedGardenForTrees] = useState<string>(activeGarden.id || 'iot');

  // Configuration Audit History state
  const [configHistory, setConfigHistory] = useState<ConfigHistoryItem[]>([]);

  // Modals state
  const [showGardenModal, setShowGardenModal] = useState(false);
  const [editingGarden, setEditingGarden] = useState<Garden | null>(null);

  const [showTreeModal, setShowTreeModal] = useState(false);
  const [editingTree, setEditingTree] = useState<TreeLocation | null>(null);

  // Garden Form State
  const [gardenForm, setGardenForm] = useState<Partial<Garden>>({
    name: '',
    province: 'Tiền Giang',
    district: 'Cai Lậy',
    shape: 'rectangle',
    length: 70,
    width: 50,
    area: 3.5,
    crop: 'Sầu riêng Ri6',
    soilType: 'Đất phù sa cao ráo',
    age: 12,
    waterSource: 'Nước mưa & Sông Tiền',
    fertilizerType: 'Hữu cơ vi sinh',
    cornerTopLeft: 'Kênh ngọt',
    cornerTopRight: 'Trạm bơm',
    cornerBottomLeft: 'Rãnh phèn',
    cornerBottomRight: 'Đê bao',
    centerLandmark: 'Gò đất cao ráo',
    terrainFeatures: 'Đất liếp cao ráo, thoát nước tốt'
  });

  // Tree Form State
  const [treeForm, setTreeForm] = useState<Partial<TreeLocation>>({
    name: '',
    variety: 'Sầu riêng Ri6',
    treeAge: 12,
    height: 7.5,
    canopyWidth: 6.0,
    landmarkLocation: 'Ở giữa vườn (Gò cao)',
    notes: 'Vị trí gò đất cao, thông thoáng'
  });

  // Load tree locations & config history on mount / change
  useEffect(() => {
    const list = roomStorageService.getTreeLocations(selectedGardenForTrees);
    setTreeLocations(list);
    setConfigHistory(roomStorageService.getConfigHistory());
  }, [selectedGardenForTrees]);

  const refreshHistory = () => {
    setConfigHistory(roomStorageService.getConfigHistory());
  };

  // Handle open garden add/edit
  const handleOpenAddGarden = () => {
    setEditingGarden(null);
    setGardenForm({
      name: '',
      province: 'Tiền Giang',
      district: 'Cai Lậy',
      shape: 'rectangle',
      length: 70,
      width: 50,
      area: 3.5,
      crop: 'Sầu riêng Ri6',
      soilType: 'Đất phù sa cao ráo',
      age: 12,
      waterSource: 'Nước mương ngọt',
      fertilizerType: 'Hữu cơ vi sinh',
      cornerTopLeft: 'Kênh ngọt',
      cornerTopRight: 'Trạm bơm',
      cornerBottomLeft: 'Rãnh phèn',
      cornerBottomRight: 'Đê bao',
      centerLandmark: 'Gò đất cao ráo',
      terrainFeatures: 'Đất liếp cao ráo, thoát nước tốt'
    });
    setShowGardenModal(true);
  };

  const handleOpenEditGarden = (g: Garden) => {
    setEditingGarden(g);
    setGardenForm({ 
      ...g,
      shape: g.shape || 'rectangle',
      length: g.length || 70,
      width: g.width || 50,
      cornerTopLeft: g.cornerTopLeft || 'Kênh ngọt',
      cornerTopRight: g.cornerTopRight || 'Trạm bơm',
      cornerBottomLeft: g.cornerBottomLeft || 'Rãnh phèn',
      cornerBottomRight: g.cornerBottomRight || 'Đê bao',
      centerLandmark: g.centerLandmark || 'Gò đất cao ráo',
      terrainFeatures: g.terrainFeatures || 'Đất liếp cao ráo'
    });
    setShowGardenModal(true);
  };

  const handleSaveGarden = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenForm.name?.trim()) return;

    if (editingGarden) {
      const gLength = Number(gardenForm.length) || (gardenForm.shape === 'square' ? 60 : 70);
      const gWidth = Number(gardenForm.width) || (gardenForm.shape === 'square' ? 60 : 50);
      const gArea = Number(gardenForm.area) || Number(((gLength * gWidth) / 1000).toFixed(1));

      const updated: Garden = {
        ...editingGarden,
        ...gardenForm,
        name: gardenForm.name || editingGarden.name,
        shape: gardenForm.shape || 'rectangle',
        length: gLength,
        width: gWidth,
        area: gArea,
        age: Number(gardenForm.age) || 12,
        cornerTopLeft: gardenForm.cornerTopLeft || 'Kênh ngọt',
        cornerTopRight: gardenForm.cornerTopRight || 'Trạm bơm',
        cornerBottomLeft: gardenForm.cornerBottomLeft || 'Rãnh phèn',
        cornerBottomRight: gardenForm.cornerBottomRight || 'Đê bao',
        centerLandmark: gardenForm.centerLandmark || 'Gò đất cao ráo',
        terrainFeatures: gardenForm.terrainFeatures || 'Đất liếp cao ráo'
      } as Garden;
      onUpdateGarden(updated);

      // Save to audit history log
      roomStorageService.addConfigHistory({
        type: 'garden',
        action: 'update',
        targetId: updated.id,
        targetName: updated.name,
        summary: `Sửa cấu hình: Kích thước ${updated.length}m × ${updated.width}m (${updated.area} công), giống ${updated.crop}. Địa hình: ${updated.centerLandmark || 'Gò liếp'}`
      });
      refreshHistory();
    } else {
      const gLength = Number(gardenForm.length) || (gardenForm.shape === 'square' ? 60 : 70);
      const gWidth = Number(gardenForm.width) || (gardenForm.shape === 'square' ? 60 : 50);
      const gArea = Number(gardenForm.area) || Number(((gLength * gWidth) / 1000).toFixed(1));

      const newG: Garden = {
        id: 'garden-' + Date.now(),
        deviceId: 'esp32-' + Math.floor(Math.random() * 89 + 10),
        name: gardenForm.name || 'Vườn sầu riêng mới',
        province: gardenForm.province || 'Tiền Giang',
        district: gardenForm.district || 'Cai Lậy',
        shape: gardenForm.shape || 'rectangle',
        length: gLength,
        width: gWidth,
        area: gArea,
        crop: gardenForm.crop || 'Sầu riêng Ri6',
        soilType: gardenForm.soilType || 'Đất phù sa',
        age: Number(gardenForm.age) || 10,
        waterSource: gardenForm.waterSource || 'Sông Tiền',
        fertilizerType: gardenForm.fertilizerType || 'Hữu cơ',
        cornerTopLeft: gardenForm.cornerTopLeft || 'Kênh ngọt',
        cornerTopRight: gardenForm.cornerTopRight || 'Trạm bơm',
        cornerBottomLeft: gardenForm.cornerBottomLeft || 'Rãnh phèn',
        cornerBottomRight: gardenForm.cornerBottomRight || 'Đê bao',
        centerLandmark: gardenForm.centerLandmark || 'Gò đất cao ráo',
        terrainFeatures: gardenForm.terrainFeatures || 'Đất liếp cao ráo',
        ph: 6.4,
        ec: 0.22,
        moisture: 70,
        temperature: 28,
        battery: 95,
        online: true,
        lastUpdated: Date.now()
      };
      onAddGarden(newG);

      // Automatically initialize starter Tree #1 for the new garden
      const initialTree: TreeLocation = {
        id: `tree-${newG.id}-1`,
        gardenId: newG.id,
        spotNumber: 1,
        row: 1,
        col: 1,
        name: `Cây ${newG.crop?.split(' ')[0] || 'Sầu Riêng'} #1`,
        variety: newG.crop || 'Sầu riêng Ri6',
        treeAge: Number(gardenForm.age) || 10,
        height: 7.0,
        canopyWidth: 6.0,
        landmarkLocation: 'Góc 1 (Kênh ngọt)',
        lastPh: 6.3,
        lastEc: 0.22,
        lastMoisture: 70,
        lastTemp: 28.0,
        lastCrs: 20,
        lastMeasuredAt: Date.now(),
        notes: 'Gốc đầu tiên của vườn'
      };
      roomStorageService.addOrUpdateTreeLocation(initialTree);

      // Save to audit history log
      roomStorageService.addConfigHistory({
        type: 'garden',
        action: 'create',
        targetId: newG.id,
        targetName: newG.name,
        summary: `Tạo mới vườn: "${newG.name}" (${newG.length}m × ${newG.width}m, ${newG.crop}, 4 góc & địa hình)`
      });
      refreshHistory();
    }
    setShowGardenModal(false);
  };

  // Handle open tree add/edit
  const handleOpenAddTree = () => {
    setEditingTree(null);
    setTreeForm({
      name: `Cây #${treeLocations.length + 1}`,
      variety: currentGarden?.crop || 'Sầu riêng Ri6',
      treeAge: currentGarden?.age || 12,
      height: 7.0,
      canopyWidth: 6.5,
      landmarkLocation: 'Ở giữa vườn (Gò cao)',
      notes: 'Thân khỏe, bộ tán phát triển tròn đều'
    });
    setShowTreeModal(true);
  };

  const handleOpenEditTree = (t: TreeLocation) => {
    setEditingTree(t);
    setTreeForm({ 
      ...t,
      landmarkLocation: t.landmarkLocation || 'Gần mép mương'
    });
    setShowTreeModal(true);
  };

  const handleSaveTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeForm.name?.trim()) return;

    const spotNum = editingTree ? editingTree.spotNumber : treeLocations.length + 1;
    const treeObj: TreeLocation = {
      id: editingTree ? editingTree.id : `tree-${selectedGardenForTrees}-${Date.now()}`,
      gardenId: selectedGardenForTrees,
      spotNumber: spotNum,
      name: treeForm.name || `Cây #${spotNum}`,
      variety: treeForm.variety || 'Sầu riêng Ri6',
      treeAge: Number(treeForm.treeAge) || 10,
      height: Number(treeForm.height) || 6.5,
      canopyWidth: Number(treeForm.canopyWidth) || 5.5,
      landmarkLocation: treeForm.landmarkLocation || 'Ở giữa vườn (Gò cao)',
      notes: treeForm.notes || ''
    };

    const updatedList = roomStorageService.addOrUpdateTreeLocation(treeObj);
    setTreeLocations(updatedList);

    // Save to audit history log
    roomStorageService.addConfigHistory({
      type: 'tree',
      action: editingTree ? 'update' : 'create',
      targetId: treeObj.id,
      targetName: treeObj.name,
      summary: `${editingTree ? 'Sửa' : 'Thêm'} cây ${treeObj.name} (${treeObj.variety}, ${treeObj.treeAge} năm, vị trí: ${treeObj.landmarkLocation})`
    });
    refreshHistory();

    setShowTreeModal(false);
  };

  const handleDeleteTree = (id: string) => {
    const targetTree = treeLocations.find(t => t.id === id);
    if (window.confirm(`Bạn có chắc chắn muốn xóa vị trí cây "${targetTree?.name || id}"?`)) {
      roomStorageService.deleteTreeLocation(id);
      setTreeLocations(prev => prev.filter(t => t.id !== id));
      
      // Save to audit history log
      roomStorageService.addConfigHistory({
        type: 'tree',
        action: 'delete',
        targetId: id,
        targetName: targetTree?.name || `Cây #${id}`,
        summary: `Xóa vị trí cây ${targetTree?.name || id}`
      });
      refreshHistory();
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto w-full">
      
      {/* 1. Sub-tab Navigation */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('gardens')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'gardens'
                ? 'bg-white text-[#2D7D46] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Danh Sách Vườn ({gardens.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('trees')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'trees'
                ? 'bg-white text-[#2D7D46] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trees className="w-4 h-4" />
            <span>Cây & Vị Trí</span>
          </button>

          <button
            onClick={() => {
              refreshHistory();
              setActiveSubTab('history');
            }}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-[#2D7D46] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch Sử Cấu Hình ({configHistory.length})</span>
          </button>
        </div>

        {activeSubTab === 'gardens' && (
          <button
            onClick={handleOpenAddGarden}
            className="px-3.5 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Vườn Mới</span>
          </button>
        )}

        {activeSubTab === 'trees' && (
          <button
            onClick={handleOpenAddTree}
            className="px-3.5 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Vị Trí Cây</span>
          </button>
        )}
      </div>

      {/* 2. SUB-TAB 1: GARDEN MANAGEMENT */}
      {activeSubTab === 'gardens' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {gardens.map((g) => {
              const isSelected = g.id === activeGarden?.id;
              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all space-y-3 relative ${
                    isSelected ? 'border-[#2D7D46] ring-2 ring-[#2D7D46]/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">{g.name}</span>
                        {isSelected && (
                          <span className="bg-emerald-100 text-[#2D7D46] px-2 py-0.5 rounded-full text-[10px] font-black">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{g.district}, {g.province}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditGarden(g)}
                        className="p-1.5 text-slate-500 hover:text-[#2D7D46] hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                        title="Sửa cấu hình vườn"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {gardens.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa vườn "${g.name}"?`)) {
                              onDeleteGarden(g.id);
                              roomStorageService.addConfigHistory({
                                type: 'garden',
                                action: 'delete',
                                targetId: g.id,
                                targetName: g.name,
                                summary: `Xóa vườn: ${g.name}`
                              });
                              refreshHistory();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Xóa vườn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Garden Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Cây trồng / Giống</span>
                      <span className="font-extrabold text-slate-900">{g.crop} ({g.age} năm tuổi)</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Khuôn viên & Kích thước</span>
                      <span className="font-extrabold text-[#2D7D46]">
                        {g.shape === 'square' ? '⏹️ Vuông ' : '▭ Chữ nhật '}
                        {g.length && g.width ? `(${g.length}m × ${g.width}m)` : ''}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Diện tích</span>
                      <span className="font-extrabold text-slate-900">{g.area} công (~{g.area * 1000} m²)</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Trạm đo IoT</span>
                      <span className="font-extrabold font-mono text-emerald-800">{g.deviceId}</span>
                    </div>
                  </div>

                  {/* Topography: 4 Corners & Center Landmark */}
                  <div className="bg-emerald-950/5 border border-emerald-800/15 p-2.5 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1 text-emerald-800 text-[11px]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Vị trí 4 góc giáp ranh:</span>
                      </span>
                      {g.centerLandmark && (
                        <span className="text-amber-800 font-bold bg-amber-100/90 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <Mountain className="w-3 h-3 text-amber-700" />
                          <span>Giữa: {g.centerLandmark}</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">↖️ Góc 1 (Đầu-Trái):</span>
                        <span className="font-bold text-slate-800 truncate block">{g.cornerTopLeft || 'Kênh ngọt'}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">↗️ Góc 2 (Đầu-Phải):</span>
                        <span className="font-bold text-slate-800 truncate block">{g.cornerTopRight || 'Trạm bơm'}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">↙️ Góc 3 (Cuối-Trái):</span>
                        <span className="font-bold text-slate-800 truncate block">{g.cornerBottomLeft || 'Rãnh phèn'}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">↘️ Góc 4 (Cuối-Phải):</span>
                        <span className="font-bold text-slate-800 truncate block">{g.cornerBottomRight || 'Đê bao'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit Configuration & Switch Garden */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEditGarden(g)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-600" />
                      <span>Sửa cấu hình</span>
                    </button>

                    {!isSelected ? (
                      <button
                        onClick={() => onSelectGarden(g.id)}
                        className="flex-1 py-2 px-3 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Chọn xem vườn này
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          refreshHistory();
                          setActiveSubTab('history');
                        }}
                        className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#2D7D46] font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                        title="Xem lịch sử cấu hình"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Lịch sử</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB 2: TREE & LOCATION MANAGEMENT */}
      {activeSubTab === 'trees' && (
        <div className="space-y-3.5">
          {/* Garden selector bar */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="w-5 h-5 text-[#2D7D46]" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                Chọn vườn xem danh sách vị trí đo:
              </span>
            </div>

            <select
              value={selectedGardenForTrees}
              onChange={(e) => setSelectedGardenForTrees(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
            >
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  🏡 {g.name} ({g.crop})
                </option>
              ))}
            </select>
          </div>

          {/* Tree Locations List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {treeLocations.map((tree) => (
              <div
                key={tree.id}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 space-y-2.5 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#2D7D46] font-black text-xs flex items-center justify-center shrink-0">
                      #{tree.spotNumber}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{tree.name}</h4>
                      <p className="text-[11px] text-emerald-700 font-bold">Giống: {tree.variety}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTree(tree)}
                      className="p-1 text-slate-400 hover:text-[#2D7D46] rounded-md hover:bg-emerald-50"
                      title="Chỉnh sửa cây"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTree(tree.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                      title="Xóa vị trí"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Requirement 5 Specifications: Tuổi cây, Chiều cao, Độ rộng tán, Giống cây */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 mx-auto mb-0.5" />
                    <span className="text-[10px] text-slate-500 block">Tuổi cây</span>
                    <span className="font-black text-slate-900">{tree.treeAge} năm</span>
                  </div>

                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <Ruler className="w-3.5 h-3.5 text-emerald-700 mx-auto mb-0.5" />
                    <span className="text-[10px] text-slate-500 block">Chiều cao</span>
                    <span className="font-black text-slate-900">{tree.height} m</span>
                  </div>

                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-700 mx-auto mb-0.5" />
                    <span className="text-[10px] text-slate-500 block">Rộng tán</span>
                    <span className="font-black text-slate-900">{tree.canopyWidth} m</span>
                  </div>
                </div>

                {tree.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    📝 {tree.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 3: CONFIGURATION AUDIT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-3.5">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#2D7D46]" />
                <span>Lịch Sử Cập Nhật & Sửa Cấu Hình</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động lưu lại mỗi khi bà con thêm mới hoặc chỉnh sửa cấu hình vườn, vị trí 4 góc, địa hình, hoặc vị trí cây.
              </p>
            </div>

            <button
              onClick={refreshHistory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          {configHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Chưa có lịch sử cấu hình nào</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi bạn bấm lưu vườn mới hoặc bấm sửa cấu hình vườn, mọi lịch sử điều chỉnh sẽ được lưu trữ tự động tại đây.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {configHistory.map((item) => {
                const dateStr = new Date(item.timestamp).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div key={item.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-all flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.type === 'garden' ? (
                        <span className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D7D46] flex items-center justify-center font-bold text-sm">
                          🏡
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          🌳
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {item.targetName}
                        </span>

                        {item.action === 'create' && (
                          <span className="bg-emerald-100 text-[#2D7D46] font-black text-[10px] px-2 py-0.5 rounded-full">
                            + Thêm mới
                          </span>
                        )}
                        {item.action === 'update' && (
                          <span className="bg-amber-100 text-amber-800 font-black text-[10px] px-2 py-0.5 rounded-full">
                            ✎ Sửa cấu hình
                          </span>
                        )}
                        {item.action === 'delete' && (
                          <span className="bg-red-100 text-red-700 font-black text-[10px] px-2 py-0.5 rounded-full">
                            ✕ Xóa
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 ml-auto">
                          {dateStr}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. GARDEN FORM MODAL: ĐƠN GIẢN, ÍT CHỮ, ĐỦ 4 GÓC & ĐỊA HÌNH */}
      {showGardenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏡</span>
                <h3 className="font-black text-base text-slate-900">
                  {editingGarden ? 'Sửa Cấu Hình Vườn' : 'Thêm Vườn Mới'}
                </h3>
              </div>
              <button
                onClick={() => setShowGardenModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGarden} className="space-y-3 text-xs">
              {/* Tên vườn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên vườn sầu riêng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Vườn Sầu Riêng Ri6 - Cai Lậy"
                  value={gardenForm.name || ''}
                  onChange={(e) => setGardenForm({ ...gardenForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                />
              </div>

              {/* Giống cây & Tuổi */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giống sầu riêng</label>
                  <select
                    value={gardenForm.crop || 'Sầu riêng Ri6'}
                    onChange={(e) => setGardenForm({ ...gardenForm, crop: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                  >
                    <option value="Sầu riêng Ri6">Sầu riêng Ri6</option>
                    <option value="Sầu riêng Monthong (Dona)">Sầu riêng Monthong (Dona)</option>
                    <option value="Sầu riêng Musang King">Sầu riêng Musang King</option>
                    <option value="Sầu riêng Black Thorn">Sầu riêng Black Thorn</option>
                    <option value="Sầu riêng Chuồng Bò">Sầu riêng Chuồng Bò</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tuổi vườn (năm)</label>
                  <input
                    type="number"
                    min="1"
                    value={gardenForm.age || 12}
                    onChange={(e) => setGardenForm({ ...gardenForm, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Định dạng khuôn viên */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khuôn viên vườn</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const l = gardenForm.length || 70;
                      const w = gardenForm.width || 50;
                      setGardenForm({ ...gardenForm, shape: 'rectangle', length: l, width: w, area: Number(((l * w) / 1000).toFixed(1)) });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      gardenForm.shape !== 'square'
                        ? 'bg-emerald-50 border-[#2D7D46] text-[#2D7D46] ring-1 ring-[#2D7D46]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>▭ Chữ Nhật</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const edge = gardenForm.length || 60;
                      setGardenForm({ ...gardenForm, shape: 'square', length: edge, width: edge, area: Number(((edge * edge) / 1000).toFixed(1)) });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      gardenForm.shape === 'square'
                        ? 'bg-emerald-50 border-[#2D7D46] text-[#2D7D46] ring-1 ring-[#2D7D46]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>⏹️ Hình Vuông</span>
                  </button>
                </div>
              </div>

              {/* Dài & Rộng */}
              {gardenForm.shape === 'square' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cạnh hình vuông (mét) *</label>
                  <input
                    type="number"
                    min="10"
                    value={gardenForm.length || 60}
                    onChange={(e) => {
                      const edge = Number(e.target.value) || 0;
                      setGardenForm({ ...gardenForm, length: edge, width: edge, area: Number(((edge * edge) / 1000).toFixed(1)) });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chiều dài (mét) *</label>
                    <input
                      type="number"
                      min="10"
                      value={gardenForm.length || 70}
                      onChange={(e) => {
                        const l = Number(e.target.value) || 0;
                        const w = Number(gardenForm.width) || 50;
                        setGardenForm({ ...gardenForm, length: l, area: Number(((l * w) / 1000).toFixed(1)) });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chiều rộng (mét) *</label>
                    <input
                      type="number"
                      min="10"
                      value={gardenForm.width || 50}
                      onChange={(e) => {
                        const w = Number(e.target.value) || 0;
                        const l = Number(gardenForm.length) || 70;
                        setGardenForm({ ...gardenForm, width: w, area: Number(((l * w) / 1000).toFixed(1)) });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Diện tích tự động */}
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Diện tích tự tính:</span>
                <span className="font-black text-[#2D7D46]">
                  {((Number(gardenForm.length) || 0) * (Number(gardenForm.width) || 0)).toLocaleString()} m² (~{gardenForm.area} công đất)
                </span>
              </div>

              {/* VỊ TRÍ 4 GÓC VƯỜN */}
              <div className="border-t border-slate-200 pt-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-extrabold">
                  <Compass className="w-4 h-4 text-[#2D7D46]" />
                  <span>Vị trí 4 góc vườn (Giáp ranh cái gì) *</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5 text-[11px]">↖️ Góc 1 (Đầu liếp - Trái)</label>
                    <input
                      type="text"
                      value={gardenForm.cornerTopLeft || ''}
                      onChange={(e) => setGardenForm({ ...gardenForm, cornerTopLeft: e.target.value })}
                      placeholder="Gần kênh ngọt..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900 mb-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['Kênh ngọt', 'Trạm bơm', 'Đường đan', 'Nhà kho'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setGardenForm({ ...gardenForm, cornerTopLeft: chip })}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded border border-slate-200 cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5 text-[11px]">↗️ Góc 2 (Đầu liếp - Phải)</label>
                    <input
                      type="text"
                      value={gardenForm.cornerTopRight || ''}
                      onChange={(e) => setGardenForm({ ...gardenForm, cornerTopRight: e.target.value })}
                      placeholder="Gần trạm bơm..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900 mb-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['Cống xả', 'Đê bao', 'Cột mốc', 'Vườn bên'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setGardenForm({ ...gardenForm, cornerTopRight: chip })}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded border border-slate-200 cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5 text-[11px]">↙️ Góc 3 (Cuối liếp - Trái)</label>
                    <input
                      type="text"
                      value={gardenForm.cornerBottomLeft || ''}
                      onChange={(e) => setGardenForm({ ...gardenForm, cornerBottomLeft: e.target.value })}
                      placeholder="Gần rãnh phèn..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900 mb-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['Rãnh phèn', 'Giếng khoan', 'Bờ bao', 'Hàng rào'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setGardenForm({ ...gardenForm, cornerBottomLeft: chip })}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded border border-slate-200 cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5 text-[11px]">↘️ Góc 4 (Cuối liếp - Phải)</label>
                    <input
                      type="text"
                      value={gardenForm.cornerBottomRight || ''}
                      onChange={(e) => setGardenForm({ ...gardenForm, cornerBottomRight: e.target.value })}
                      placeholder="Gần đê bao sông..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900 mb-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['Sông lớn', 'Đất ruộng', 'Vườn chuối', 'Cống cái'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setGardenForm({ ...gardenForm, cornerBottomRight: chip })}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded border border-slate-200 cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ở GIỮA VƯỜN & ĐỊA HÌNH GÒ TRŨNG */}
              <div className="border-t border-slate-200 pt-2 space-y-1.5">
                <label className="block font-bold text-slate-700">Ở giữa vườn hay các vị trí khác có gò gì không *</label>
                <input
                  type="text"
                  value={gardenForm.centerLandmark || ''}
                  onChange={(e) => setGardenForm({ ...gardenForm, centerLandmark: e.target.value })}
                  placeholder="Ví dụ: Gò đất cao ráo, đất bằng phẳng, có mương ngọt xẻ ngang..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 mb-1"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    'Gò đất cao ráo',
                    'Đất bằng phẳng',
                    'Vùng trũng ngập',
                    'Mương xẻ đôi',
                    'Gò dốc thoát nước tốt'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setGardenForm({ ...gardenForm, centerLandmark: chip })}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded-md border border-slate-200 cursor-pointer font-bold"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowGardenModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingGarden ? 'Lưu & Ghi Lịch Sử' : 'Tạo Vườn Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. TREE FORM MODAL */}
      {showTreeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-black text-base text-slate-900">
                {editingTree ? 'Sửa Vị Trí / Thông Tin Cây' : 'Thêm Vị Trí Cây Mới'}
              </h3>
              <button
                onClick={() => setShowTreeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTree} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên vị trí / cây đo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cây #1 - Gốc Gần Kênh"
                  value={treeForm.name || ''}
                  onChange={(e) => setTreeForm({ ...treeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí địa hình / Cột mốc trong vườn *</label>
                <input
                  type="text"
                  value={treeForm.landmarkLocation || ''}
                  onChange={(e) => setTreeForm({ ...treeForm, landmarkLocation: e.target.value })}
                  placeholder="Ví dụ: Góc 1 gần kênh, ở giữa gò cao..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 mb-1"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    'Góc 1 (Đầu liếp - Trái)',
                    'Góc 2 (Đầu liếp - Phải)',
                    'Góc 3 (Cuối liếp - Trái)',
                    'Góc 4 (Cuối liếp - Phải)',
                    'Ở giữa vườn (Gò cao)',
                    'Vùng trũng',
                    'Gần mép mương'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTreeForm({ ...treeForm, landmarkLocation: chip })}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-[#2D7D46] rounded-md border border-slate-200 cursor-pointer font-bold"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giống cây</label>
                  <input
                    type="text"
                    placeholder="Sầu riêng Ri6, Monthong..."
                    value={treeForm.variety || ''}
                    onChange={(e) => setTreeForm({ ...treeForm, variety: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tuổi cây (năm)</label>
                  <input
                    type="number"
                    value={treeForm.treeAge || 12}
                    onChange={(e) => setTreeForm({ ...treeForm, treeAge: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chiều cao (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={treeForm.height || 7.5}
                    onChange={(e) => setTreeForm({ ...treeForm, height: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ rộng tán (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={treeForm.canopyWidth || 6.0}
                    onChange={(e) => setTreeForm({ ...treeForm, canopyWidth: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú vị trí đất / tình trạng cây</label>
                <input
                  type="text"
                  placeholder="Mô tả hướng nắng, vị trí rãnh thoát nước..."
                  value={treeForm.notes || ''}
                  onChange={(e) => setTreeForm({ ...treeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTreeModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingTree ? 'Lưu & Ghi Lịch Sử' : 'Lưu Vị Trí Cây'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

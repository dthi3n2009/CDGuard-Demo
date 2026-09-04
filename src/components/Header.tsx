import React, { useState } from 'react';
import { Garden, UserProfile, SyncStatusState } from '../types';
import { Shield, ChevronDown, Battery, Wifi, WifiOff, User, Wrench, LogOut, Plus, BookOpen, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { InstallApkModal } from './InstallApkModal';

interface HeaderProps {
  gardens: Garden[];
  currentGarden: Garden;
  onSelectGarden: (gardenId: string) => void;
  onOpenAddGarden: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isDevMode: boolean;
  onToggleDevPanel: () => void;
  onOpenConsultationHistory?: () => void;
  syncStatus?: SyncStatusState;
  lastSyncTime?: number;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gardens,
  currentGarden,
  onSelectGarden,
  onOpenAddGarden,
  userProfile,
  onLogout,
  isDevMode,
  onToggleDevPanel,
  onOpenConsultationHistory,
  syncStatus = 'updated',
  lastSyncTime = Date.now(),
  onManualSync
}) => {
  const [showGardenMenu, setShowGardenMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApkModal, setShowApkModal] = useState(false);

  const formatLastSyncTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-[#1A3D2B] text-white sticky top-0 z-30 shadow-md px-3 sm:px-4 py-2.5 border-b border-[#2D7D46]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2">
          <div className="bg-[#2D7D46] p-1.5 sm:p-2 rounded-xl flex items-center justify-center shadow-inner">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[#FFC107] font-black text-base sm:text-lg tracking-wider leading-none">
              CDGuard
            </h1>
            <p className="text-[10px] text-emerald-200 font-medium">
              Sầu riêng ĐBSCL
            </p>
          </div>
        </div>

        {/* Garden Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGardenMenu(!showGardenMenu)}
            className="bg-[#0D2B2B] hover:bg-emerald-900 border border-emerald-700/60 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-100 transition-all"
          >
            <span className="max-w-[90px] sm:max-w-[150px] truncate">{currentGarden.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          </button>

          {showGardenMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E3E9E5] py-1 text-[#1F2D24] z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7D72] uppercase tracking-wider border-b">
                Danh sách vườn ({gardens.length})
              </div>
              {gardens.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    onSelectGarden(g.id);
                    setShowGardenMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 ${
                    g.id === currentGarden.id ? 'bg-emerald-100/60 font-bold text-[#2D7D46]' : ''
                  }`}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-[10px] text-[#6B7D72]">{g.province}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowGardenMenu(false);
                  onOpenAddGarden();
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#2D7D46] font-bold hover:bg-emerald-50 border-t flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm vườn mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Requirement 8: Realtime Sync Status Indicator */}
          {syncStatus === 'syncing' && (
            <button
              onClick={onManualSync}
              title="Đang đồng bộ dữ liệu với máy chủ Firebase..."
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1 animate-pulse hover:bg-blue-500/30 transition-all"
            >
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="hidden xs:inline">Đang đồng bộ...</span>
            </button>
          )}

          {syncStatus === 'updated' && (
            <button
              onClick={onManualSync}
              title="Bấm để đồng bộ dữ liệu mới nhất từ Firebase ngay lập tức"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 hover:bg-emerald-500/30 hover:border-emerald-400 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Đã cập nhật {formatLastSyncTime(lastSyncTime)}</span>
              <span className="sm:hidden">Realtime</span>
            </button>
          )}

          {syncStatus === 'disconnected' && (
            <button
              onClick={onManualSync}
              title="Mất kết nối. Bấm để thử kết nối lại Firebase ngay"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer transition-all"
            >
              <CloudOff className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Thử lại</span>
            </button>
          )}

          {syncStatus === 'error' && (
            <button
              onClick={onManualSync}
              title="Lỗi tải dữ liệu. Bấm để thử lại"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 hover:bg-red-500/30 cursor-pointer transition-all"
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="hidden xs:inline">Lỗi - Bấm thử lại</span>
            </button>
          )}

          {/* Battery */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentGarden.battery}%</span>
          </div>

          {/* Dev Mode Panel Toggle */}
          {isDevMode && (
            <button
              onClick={onToggleDevPanel}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
              title="Bảng điều khiển Dev Mode"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dev Mode</span>
            </button>
          )}

          {/* User Account Button */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1.5 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 flex items-center justify-center"
            >
              <User className="w-4 h-4" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#E3E9E5] py-2 text-[#1F2D24] z-50">
                <div className="px-3 py-1.5 border-b">
                  <p className="text-xs font-bold truncate">
                    {userProfile?.displayName || (isDevMode ? 'Dev Mode Tester' : 'Khách vãng lai')}
                  </p>
                  <p className="text-[10px] text-[#6B7D72] truncate">
                    {userProfile?.email || (isDevMode ? 'dev@saurieng.vn' : 'Chế độ Demo')}
                  </p>
                </div>

                {onOpenConsultationHistory && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenConsultationHistory();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-[#2D7D46] font-bold hover:bg-emerald-50 border-b flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Hồ sơ tư vấn & Nhật ký</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowApkModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#2D7D46] font-bold hover:bg-emerald-50 border-b flex items-center gap-2"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Tải APK Demo / Cài App</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 font-bold hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất / Chuyển tài khoản</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Render Install APK Modal */}
      {showApkModal && (
        <InstallApkModal onClose={() => setShowApkModal(false)} />
      )}
    </header>
  );
};


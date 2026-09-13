import React, { useState } from 'react';
import { Garden, UserProfile, SyncStatusState } from '../types';
import { ChevronDown, Wifi, WifiOff, User, Wrench, LogOut, Plus, BookOpen, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { InstallApkModal } from './InstallApkModal';

interface HeaderProps {
  gardens: Garden[];
  currentGarden: Garden;
  onSelectGarden: (gardenId: string) => void;
  onOpenAddGarden: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onResetApp: () => void;
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
  onResetApp,
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
          <div className="bg-white p-0.5 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
            <img src="/caguard-logo.png" alt="Logo CaGuard" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
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
              title="Xem bộ số đo mới nhất từ máy"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1 animate-pulse hover:bg-blue-500/30 transition-all"
            >
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              <span>Realtime</span>
            </button>
          )}

          {syncStatus === 'updated' && (
            <button
              onClick={onManualSync}
              title="Bấm để đồng bộ dữ liệu mới nhất từ Firebase ngay lập tức"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 hover:bg-emerald-500/30 hover:border-emerald-400 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Realtime</span>
            </button>
          )}

          {syncStatus === 'disconnected' && (
            <button
              onClick={onManualSync}
              title="Bấm để xem số đo từ máy, không cần gán cây"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer transition-all"
            >
              <CloudOff className="w-3 h-3 text-amber-400" />
              <span>Realtime</span>
            </button>
          )}

          {syncStatus === 'error' && (
            <button
              onClick={onManualSync}
              title="Lỗi tải dữ liệu. Bấm để thử lại"
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 hover:bg-red-500/30 cursor-pointer transition-all"
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>Realtime</span>
            </button>
          )}

          {/* User Account Button */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 flex items-center justify-center cursor-pointer transition-all"
              title={userProfile?.email || 'Tài khoản'}
            >
              {userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || 'Google'} 
                  className="w-6 h-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                  {(userProfile?.displayName || userProfile?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 text-[#1F2D24] z-50 animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {userProfile?.displayName || 'Chủ vườn Sầu riêng'}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {userProfile?.email || 'Chế độ xem thử'}
                  </p>
                  {userProfile?.email && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Tài khoản Google</span>
                    </div>
                  )}
                </div>

                {onOpenConsultationHistory && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenConsultationHistory();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#2D7D46] font-bold hover:bg-emerald-50 border-b border-slate-100 flex items-center gap-2 cursor-pointer"
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
                  className="w-full text-left px-3.5 py-2 text-xs text-[#2D7D46] font-bold hover:bg-emerald-50 border-b border-slate-100 flex items-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Tải APK Demo / Cài App</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất / Chuyển tài khoản</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onResetApp(); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-amber-700 hover:bg-amber-50"
                >
                  Đưa app về trạng thái mới
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


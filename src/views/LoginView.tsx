import React from 'react';
import { UserProfile } from '../types';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { localStorageService } from '../services/localStorageService';

interface LoginViewProps {
  onLoginSuccess: (profile: UserProfile, authMode: 'google' | 'demo') => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const handleEnterApp = () => {
    localStorageService.resetForNewUser();
    const profile: UserProfile = { id: 'guest-user', displayName: 'Khách CDGuard', isDemo: true };
    localStorageService.saveSettings({ authMode: 'demo', onboardingCompleted: false, currentGardenId: 'iot' });
    localStorageService.saveUserProfile(profile);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D2B2B] via-[#1A3D2B] to-[#2D7D46] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Brand */}
      <div className="pt-6 sm:pt-10 max-w-md mx-auto w-full text-center relative z-10">
        <div className="inline-flex items-center justify-center p-1 bg-white border border-emerald-500/30 rounded-3xl shadow-2xl mb-4 overflow-hidden">
          <img src="/caguard-logo.png" alt="Logo CaGuard" className="w-24 h-24 object-contain" />
        </div>
        
        <h1 className="text-3xl font-black tracking-tight text-[#FFC107] mb-2">
          CDGuard
        </h1>

        <div className="inline-block px-3 py-1 bg-emerald-900/80 rounded-full border border-emerald-500/30 text-[11px] font-bold text-emerald-200 uppercase tracking-widest mb-4">
          IoT & Nông Nghiệp Thông Minh
        </div>

        <p className="text-sm sm:text-base text-emerald-100 font-medium max-w-xs mx-auto leading-relaxed">
          Hệ thống giám sát nguy cơ Cadmium thông minh cho vườn sầu riêng ĐBSCL.
        </p>
      </div>

      {/* Features bullet highlight */}
      <div className="max-w-md mx-auto w-full my-6 bg-black/20 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm relative z-10 space-y-2 text-xs text-emerald-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#FFC107] shrink-0" />
          <span>Tự động tính Chỉ số Nguy cơ Cadmium (CRS) theo thời gian thực</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#FFC107] shrink-0" />
          <span>Kết nối cảm biến đất 4-in-1 (pH, EC, Độ ẩm, Nhiệt độ) qua 4G</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#FFC107] shrink-0" />
          <span>Lộ trình xử lý cải tạo đất chuyên biệt cho sầu riêng Ri6 & Monthong</span>
        </div>
      </div>

      {/* Login Options Container */}
      <div className="max-w-md mx-auto w-full space-y-3 relative z-10 mb-6">
        
        <div className="space-y-1.5">
          <button
            onClick={handleEnterApp}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-black py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] border-2 border-white/80 cursor-pointer"
          >
            <ArrowRight className="w-5 h-5 text-[#2D7D46]" />
            <span className="text-sm font-black">BẮT ĐẦU THIẾT LẬP VƯỜN</span>
          </button>

        </div>

        <button
          onClick={handleEnterApp}
          className="w-full bg-[#FFC107] hover:bg-amber-400 text-slate-950 font-black py-3.5 px-5 rounded-2xl shadow-xl border-2 border-amber-300 flex items-center justify-between gap-3 transition-all active:scale-[0.98] text-base cursor-pointer mt-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div className="text-left">
              <span className="block font-black text-sm sm:text-base text-slate-950">NGƯỜI DÙNG MỚI</span>
              <span className="block text-[11px] text-slate-800 font-extrabold">Xóa dữ liệu cũ và tự nhập từ đầu</span>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-slate-950 shrink-0" />
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-emerald-300/60 pb-2 relative z-10">
        © CDGuard - Giám sát nguy cơ đất vườn sầu riêng ĐBSCL
      </div>


    </div>
  );
};


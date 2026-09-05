import React, { useState } from 'react';
import { loginWithGoogle } from '../services/firebaseService';
import { UserProfile } from '../types';
import { Shield, Sparkles, Wrench, ArrowRight, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { GoogleSignInModal } from '../components/GoogleSignInModal';

interface LoginViewProps {
  onLoginSuccess: (profile: UserProfile, authMode: 'google' | 'demo' | 'dev') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleOpenGoogleLogin = () => {
    setErrorMessage(null);
    setShowGoogleModal(true);
  };

  const handleSelectGoogleAccount = (acc: { email: string; displayName: string; photoURL?: string }) => {
    setShowGoogleModal(false);
    onLoginSuccess(
      {
        id: `google_${acc.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: acc.email,
        displayName: acc.displayName || 'Chủ vườn Sầu riêng',
        photoURL: acc.photoURL,
        isDemo: false,
        isDevMode: false
      },
      'google'
    );
  };

  const handleQuickGoogleLogin = () => {
    handleSelectGoogleAccount({
      email: 'thiennpdfct31189@gmail.com',
      displayName: 'Thiện Nguyễn',
      photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=Thien%20Nguyen&backgroundColor=059669&textColor=ffffff'
    });
  };

  const handleTryFirebasePopup = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        setShowGoogleModal(false);
        onLoginSuccess(
          {
            id: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || 'Chủ vườn Sầu riêng',
            photoURL: user.photoURL || undefined,
            isDemo: false,
            isDevMode: false
          },
          'google'
        );
      }
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      setErrorMessage(
        err?.message || 'Cửa sổ Firebase Auth chưa thể kết nối. Bạn hãy chọn tài khoản Google để đăng nhập trực tiếp an toàn!'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    onLoginSuccess(
      {
        id: 'demo-user',
        displayName: 'Chủ Vườn Demo (Tiền Giang)',
        isDemo: true,
        isDevMode: false
      },
      'demo'
    );
  };

  const handleDevModeLogin = () => {
    onLoginSuccess(
      {
        id: 'dev-user',
        displayName: 'Kỹ Sư Dev Mode',
        isDemo: true,
        isDevMode: true
      },
      'dev'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D2B2B] via-[#1A3D2B] to-[#2D7D46] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Brand */}
      <div className="pt-6 sm:pt-10 max-w-md mx-auto w-full text-center relative z-10">
        <div className="inline-flex items-center justify-center p-4 bg-emerald-900/60 border border-emerald-500/30 rounded-3xl shadow-2xl mb-4 backdrop-blur-md">
          <Shield className="w-12 h-12 text-[#FFC107] animate-pulse" />
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
        
        {errorMessage && (
          <div className="bg-amber-900/80 border border-amber-500 text-amber-100 text-xs p-3 rounded-2xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Option 1: Google Login (Primary Authentic User Login) */}
        <div className="space-y-1.5">
          <button
            onClick={handleOpenGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-black py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] border-2 border-white/80 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-sm font-black">Đăng nhập tài khoản Google</span>
          </button>

          {/* Quick One-Click Google Login for active user */}
          <button
            type="button"
            onClick={handleQuickGoogleLogin}
            className="w-full text-center text-xs font-bold text-emerald-200 hover:text-white bg-black/20 hover:bg-black/40 py-2 px-3 rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tiếp tục nhanh với: <strong className="text-amber-300 underline font-black">thiennpdfct31189@gmail.com</strong></span>
          </button>
        </div>

        {/* Option 2: Demo Mode (Quick preview for farmers) */}
        <button
          onClick={handleDemoLogin}
          className="w-full bg-[#FFC107] hover:bg-amber-400 text-slate-950 font-black py-3.5 px-5 rounded-2xl shadow-xl border-2 border-amber-300 flex items-center justify-between gap-3 transition-all active:scale-[0.98] text-base cursor-pointer mt-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div className="text-left">
              <span className="block font-black text-sm sm:text-base text-slate-950">XEM TRẠNG THÁI VƯỜN NGAY</span>
              <span className="block text-[11px] text-slate-800 font-extrabold">Chế độ xem thử mẫu – Dành cho nông dân</span>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-slate-950 shrink-0" />
        </button>

        {/* Option 3: Dev Mode */}
        <button
          onClick={handleDevModeLogin}
          className="w-full bg-[#0D2B2B]/80 hover:bg-[#0D2B2B] text-amber-300 font-extrabold py-3 px-4 rounded-2xl border border-amber-500/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span className="text-xs">Demo có thể chỉnh cảm biến – Dev Mode</span>
          <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70" />
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-emerald-300/60 pb-2 relative z-10">
        © CDGuard - Giám sát nguy cơ đất vườn sầu riêng ĐBSCL
      </div>

      {/* Google Sign-in Account Selector Modal */}
      <GoogleSignInModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleSelectGoogleAccount}
        onTryFirebasePopup={handleTryFirebasePopup}
        isLoading={loading}
      />

    </div>
  );
};


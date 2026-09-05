import React, { useState } from 'react';
import { X, Shield, Mail, Check, AlertCircle } from 'lucide-react';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; displayName: string; photoURL?: string }) => void;
  onTryFirebasePopup?: () => Promise<void>;
  isLoading?: boolean;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  onTryFirebasePopup,
  isLoading = false
}) => {
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email Google (Gmail) của bạn.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Địa chỉ email không hợp lệ (ví dụ: chuvuon@gmail.com).');
      return;
    }

    const defaultName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const finalName = displayName.trim() || defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    setError(null);
    onSelectAccount({
      email: cleanEmail,
      displayName: finalName,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}&backgroundColor=059669&textColor=ffffff`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google Brand */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between relative bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Đăng nhập tài khoản Google
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Nhập tài khoản để đồng bộ dữ liệu vườn sầu riêng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Địa chỉ Gmail của bạn <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="vi-du: chuvuon@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên chủ vườn / Nhà vườn (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A (Vườn Ri6 Cái Mơn)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>Xác nhận đăng nhập Google</span>
          </button>

          {/* Privacy & Sync Security Badge */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Bảo mật thông tin nông hộ</p>
              <p className="text-emerald-700 mt-0.5">
                Dữ liệu đo đạc pH/EC đất và lịch sử vườn sẽ được đồng bộ an toàn theo tài khoản của bạn.
              </p>
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống CDGuard Sầu Riêng</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

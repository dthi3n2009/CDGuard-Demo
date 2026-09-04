import React, { useState } from 'react';
import { X, Smartphone, Download, ExternalLink, CheckCircle2, Sparkles, Copy, Share2 } from 'lucide-react';

interface InstallApkModalProps {
  onClose: () => void;
}

export const InstallApkModal: React.FC<InstallApkModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#1A3D2B] text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D7D46] flex items-center justify-center text-amber-300">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                Hướng Dẫn Tải & Cài Đặt APK Demo
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                Cài ứng dụng CDGuard lên điện thoại Android / iOS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-full transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          
          {/* Quick Option 1: PWA Add to Home Screen */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-2 font-extrabold text-[#2D7D46] text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Cách 1: Cài đặt dạng PWA (Nhanh nhất - Không cần file APK)</span>
            </div>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Ứng dụng web đã hỗ trợ PWA. Chú chỉ cần mở web trên điện thoại Android/iPhone và nhấn:
            </p>
            <ol className="list-decimal list-inside text-xs mt-2 space-y-1 text-slate-800 font-semibold">
              <li>Mở trình duyệt <strong>Chrome (Android)</strong> hoặc <strong>Safari (iPhone)</strong>.</li>
              <li>Bấm nút menu <strong>(⋮ 3 chấm)</strong> trên Chrome hoặc nút <strong>Chia sẻ (Share)</strong> trên Safari.</li>
              <li>Chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong> hoặc <strong>"Cài đặt ứng dụng"</strong>.</li>
            </ol>
            <p className="text-[11px] text-emerald-700 font-bold mt-2">
              ✓ App sẽ xuất hiện biểu tượng Icon ngoài màn hình chính, chạy mượt full màn hình như ứng dụng tải từ CH Play!
            </p>
          </div>

          {/* Option 2: PWABuilder to APK */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
              <Download className="w-4 h-4 text-[#2D7D46]" />
              <span>Cách 2: Đóng gói thành file APK Android qua PWABuilder (Miễn phí 1 phút)</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Nếu chú muốn có sẵn đường link file <strong>.apk</strong> để gửi qua Zalo cho mọi người cài trực tiếp:
            </p>

            {/* Step list */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-[#2D7D46] rounded-full flex items-center justify-center font-bold shrink-0 text-[11px]">1</span>
                <div>
                  Sao chép link web demo hiện tại:
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 flex-1 truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 min-h-[32px]"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-[#2D7D46] rounded-full flex items-center justify-center font-bold shrink-0 text-[11px]">2</span>
                <div>
                  Truy cập công cụ tạo APK miễn phí của Microsoft:
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[#2D7D46] font-extrabold hover:underline"
                  >
                    <span>pwabuilder.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-[#2D7D46] rounded-full flex items-center justify-center font-bold shrink-0 text-[11px]">3</span>
                <span>Dán URL ở trên vào ô &amp; nhấn <strong>Start</strong> → Chọn <strong>Download Android Package (.apk)</strong>.</span>
              </div>
            </div>
          </div>

          {/* Option 3: Export Source Code */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 block mb-1">Cách 3: Xuất Mã Nguồn (Export Source Code)</span>
            <span>Nếu cần build ứng dụng native hoàn chỉnh (Android Studio / Capacitor), chú có thể dùng tính năng <strong>Settings → Export Code (Zip/GitHub)</strong> ở góc phải màn hình AI Studio.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2D7D46] hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs min-h-[40px]"
          >
            Đã hiểu
          </button>
        </div>

      </div>
    </div>
  );
};

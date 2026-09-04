import React, { useState } from 'react';
import { ConsultationSession } from '../types';
import { localStorageService } from '../services/localStorageService';
import { X, Calendar, MessageSquare, ChevronDown, ChevronUp, Trash2, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';

interface ConsultationHistoryModalProps {
  onClose: () => void;
}

export const ConsultationHistoryModal: React.FC<ConsultationHistoryModalProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<ConsultationSession[]>(() => localStorageService.getArchivedSessions());
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id || null);
  const [sessionToDelete, setSessionToDelete] = useState<ConsultationSession | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const confirmDeleteSingle = () => {
    if (!sessionToDelete) return;
    const updated = sessions.filter(s => s.id !== sessionToDelete.id);
    setSessions(updated);
    localStorageService.saveArchivedSessions(updated);
    setSessionToDelete(null);
    setToastMessage('Đã xóa lượt tư vấn khỏi hồ sơ cá nhân.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const confirmClearAllSessions = () => {
    setSessions([]);
    localStorageService.saveArchivedSessions([]);
    setShowConfirmClearAll(false);
    setToastMessage('Đã xóa toàn bộ nhật ký tư vấn.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-30 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#1A3D2B] text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2D7D46] flex items-center justify-center text-amber-400 font-bold shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                Hồ Sơ Tư Vấn & Nhật Ký Cải Tiến
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                Lịch sử giải pháp CDGuard lưu trữ cho từng chu kỳ chăm sóc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-emerald-800 text-emerald-200 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 bg-slate-50 space-y-3.5">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <div className="w-12 h-12 bg-emerald-50 text-[#2D7D46] rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">Chưa có lượt tư vấn nào được lưu</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Khi chú nông dân trò chuyện xong lượt tư vấn ngắn/dài hạn và nhấn <strong>"Xong Lượt & Lưu Hồ Sơ"</strong>, nội dung sẽ được lưu gọn gàng tại đây để tiện theo dõi sau này.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
                <span>Tổng cộng: <strong className="text-[#2D7D46]">{sessions.length}</strong> lượt tư vấn đã lưu</span>
                <button
                  onClick={() => setShowConfirmClearAll(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 flex items-center gap-1 font-extrabold transition-all min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tất cả hồ sơ</span>
                </button>
              </div>

              {sessions.map((sess) => {
                const isExpanded = expandedId === sess.id;
                return (
                  <div
                    key={sess.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-emerald-300"
                  >
                    {/* Session Card Summary Bar */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : sess.id)}
                      className="p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/80 flex items-center justify-between gap-3 select-none"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold bg-emerald-100 text-[#2D7D46] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {sess.dateStr}
                          </span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                            Vườn: {sess.gardenName}
                          </span>
                        </div>
                        <p className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {sess.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(sess);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-transparent hover:border-red-200"
                          title="Xóa lượt tư vấn này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Message Transcript */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-100/70 p-3.5 sm:p-4 space-y-2.5">
                        <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#2D7D46]" />
                          <span>Chi tiết hội thoại lượt này ({sess.messages.length} trao đổi)</span>
                        </div>

                        {sess.messages.map((m, idx) => {
                          const isUser = m.sender === 'user';
                          return (
                            <div
                              key={m.id || idx}
                              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isUser ? 'bg-slate-700 text-white' : 'bg-[#2D7D46] text-white'
                              }`}>
                                {isUser ? 'Tôi' : 'AI'}
                              </div>
                              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                                isUser 
                                  ? 'bg-[#2D7D46] text-white rounded-tr-xs font-medium'
                                  : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-tl-xs whitespace-pre-wrap'
                              }`}>
                                {m.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-xs min-h-[44px]"
          >
            Đóng bảng nhật ký
          </button>
        </div>

        {/* Custom Confirmation Dialog for Single Item Delete */}
        {sessionToDelete && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl animate-in zoom-in-95">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Xác nhận xóa lượt tư vấn này?
              </h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Lượt tư vấn ngày <strong>{sessionToDelete.dateStr}</strong> sẽ bị xóa vĩnh viễn khỏi hồ sơ nông dân.
              </p>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDeleteSingle}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold min-h-[44px]"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Dialog for Clear All */}
        {showConfirmClearAll && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl animate-in zoom-in-95">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Xóa toàn bộ hồ sơ tư vấn?
              </h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Hành động này sẽ xóa sạch tất cả {sessions.length} lượt tư vấn giải pháp đã lưu trong nhật ký.
              </p>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowConfirmClearAll(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmClearAllSessions}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold min-h-[44px]"
                >
                  Xóa tất cả
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Garden, ChatMessage } from '../types';
import { sendChatMessage } from '../services/aiService';
import { localStorageService } from '../services/localStorageService';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import { ConsultationHistoryModal } from '../components/ConsultationHistoryModal';
import { Send, Trash2, Sparkles, ChevronDown, ChevronUp, BookOpen, CheckCircle2, BookmarkCheck } from 'lucide-react';

interface AIAssistantTabProps {
  garden: Garden;
}

const QUICK_QUESTIONS = [
  "Vì sao vườn đang cảnh báo?",
  "Hôm nay tôi nên làm gì?",
  "Có cần xét nghiệm đất không?"
];

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ garden }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedInit, setExpandedInit] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const crsScore = calculateCRS(garden.ph, garden.ec, garden.moisture, garden.temperature);
  const crsInfo = getCRSInfo(crsScore, garden.ph, garden.ec, garden.moisture, garden.temperature);

  const archivedSessions = localStorageService.getArchivedSessions();

  // Generate structured short initial answer (80-120 words)
  const getInitialAnswer = () => {
    let issue = "Đất vườn đang gặp cảnh báo nguy cơ do độ chua cao và tích tụ mặn.";
    if (garden.ph >= 5.8 && garden.ec <= 2.0 && garden.moisture <= 75) {
      issue = "Đất vườn hiện tại ở mức an toàn, chưa phát hiện bất thường nghiêm trọng.";
    }

    let cause = `pH = ${garden.ph.toFixed(1).replace('.', ',')} (đất chua) và EC = ${garden.ec.toFixed(2).replace('.', ',')} dS/m.`;
    let firstAction = "Khai thông rãnh thoát nước mương và đo lại độ mặn nước sông trước khi tưới.";
    let labAdvice = "Khi điểm CRS duy trì trên 65 quá 2 tuần hoặc chuẩn bị thu hoạch xuất khẩu.";

    return {
      issue,
      cause,
      firstAction,
      labAdvice
    };
  };

  const initData = getInitialAnswer();

  useEffect(() => {
    const history = localStorageService.getChatHistory();
    if (history && history.length > 0) {
      setMessages(history);
    } else {
      const welcomeText = `👨‍🌾 Chào chú chủ vườn **${garden.name}**!\n\n1. **Vấn đề hiện tại:** ${initData.issue}\n2. **Nguyên nhân:** ${initData.cause}\n3. **Việc cần làm đầu tiên:** ${initData.firstAction}\n4. **Khi nào cần xét nghiệm:** ${initData.labAdvice}`;

      const initMsg: ChatMessage = {
        id: 'init-msg',
        sender: 'assistant',
        text: welcomeText,
        timestamp: Date.now()
      };
      setMessages([initMsg]);
      localStorageService.saveChatHistory([initMsg]);
    }
  }, [garden.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(textToSend, newHistory, garden);
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: reply,
        timestamp: Date.now()
      };

      const updated = [...newHistory, botMsg];
      setMessages(updated);
      localStorageService.saveChatHistory(updated);
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setLoading(false);
    }
  };

  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const handleArchiveAndReset = () => {
    if (messages.length === 0) return;

    const saved = localStorageService.archiveCurrentChatSession(messages, garden.name);
    if (saved) {
      const welcomeText = `👨‍🌾 Chào chú chủ vườn **${garden.name}**!\n\nĐã lưu đợt tư vấn vừa rồi vào **Hồ sơ người dùng**.\n\n1. **Vấn đề hiện tại:** ${initData.issue}\n2. **Nguyên nhân:** ${initData.cause}\n3. **Việc cần làm đầu tiên:** ${initData.firstAction}\n4. **Khi nào cần xét nghiệm:** ${initData.labAdvice}`;

      const initMsg: ChatMessage = {
        id: 'init-msg-' + Date.now(),
        sender: 'assistant',
        text: welcomeText,
        timestamp: Date.now()
      };
      setMessages([initMsg]);
      localStorageService.saveChatHistory([initMsg]);

      setToastNotice('Đã lưu cuộc trò chuyện vào Hồ Sơ Tư Vấn! Màn hình chat đã được làm mới.');
      setTimeout(() => setToastNotice(null), 4500);
    }
  };

  const handleDirectClearWithoutArchive = () => {
    const welcomeText = `👨‍🌾 Chào chú chủ vườn **${garden.name}**!\n\nMàn hình trò chuyện đã được làm mới.\n\n1. **Vấn đề hiện tại:** ${initData.issue}\n2. **Nguyên nhân:** ${initData.cause}\n3. **Việc cần làm đầu tiên:** ${initData.firstAction}\n4. **Khi nào cần xét nghiệm:** ${initData.labAdvice}`;

    const initMsg: ChatMessage = {
      id: 'init-msg-' + Date.now(),
      sender: 'assistant',
      text: welcomeText,
      timestamp: Date.now()
    };
    setMessages([initMsg]);
    localStorageService.saveChatHistory([initMsg]);
    setShowClearConfirmModal(false);

    setToastNotice('Đã làm mới màn hình nhắn tin.');
    setTimeout(() => setToastNotice(null), 3000);
  };


  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md overflow-hidden relative">
      
      {/* Toast notice inside chat */}
      {toastNotice && (
        <div className="absolute top-16 left-3 right-3 z-30 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <BookmarkCheck className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="flex-1">{toastNotice}</span>
        </div>
      )}

      {/* 1. Ultra-Compact Header for Maximum Chat Viewport */}
      <div className="bg-white px-3 py-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Avatar + Compact Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2D7D46] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              👨‍🌾
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate leading-tight">
                  Trợ Lý CDGuard
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Đang hoạt động" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Vườn: {garden.name}
              </p>
            </div>
          </div>

          {/* Right: Compact Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#2D7D46] border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all min-h-[36px]"
              title="Xem Hồ Sơ Tư Vấn"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hồ sơ ({archivedSessions.length})</span>
            </button>

            <button
              onClick={handleArchiveAndReset}
              disabled={messages.length <= 1}
              className="px-2 py-1.5 bg-[#2D7D46] hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all min-h-[36px]"
              title="Xóa tin nhắn hiển thị & Lưu vào Hồ sơ"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Lưu lượt</span>
            </button>

            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Xóa hiển thị tin nhắn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Spacious Main Chat Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const isFirstAssistant = !isUser && idx === 0;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[#2D7D46] text-white flex items-center justify-center shrink-0 text-sm font-bold mt-1 shadow-xs">
                  👨‍🌾
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[82%] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl text-sm sm:text-base leading-relaxed sm:leading-loose ${
                  isUser
                    ? 'bg-[#2D7D46] text-white rounded-tr-xs font-medium shadow-xs'
                    : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200 shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-wrap break-words font-sans">
                  {isUser ? msg.text : renderFormattedText(msg.text)}
                </div>

                {/* Optional Expandable Deep Detail Button for First Welcome Message */}
                {isFirstAssistant && (
                  <div className="mt-3 pt-3 border-t border-slate-200/90">
                    <button
                      onClick={() => setExpandedInit(!expandedInit)}
                      className="text-xs sm:text-sm font-extrabold text-[#2D7D46] hover:underline flex items-center gap-1.5 min-h-[38px]"
                    >
                      <span>{expandedInit ? 'Thu gọn giải thích' : 'Xem giải thích chi tiết chỉ số'}</span>
                      {expandedInit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandedInit && (
                      <div className="mt-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs sm:text-sm text-slate-800 space-y-2 font-sans">
                        <p>• <strong>Độ chua pH ({garden.ph.toFixed(1)}):</strong> Khi pH giảm sâu dưới 5,5, các kim loại trong đất hòa tan tự do trong dung dịch đất.</p>
                        <p>• <strong>Độ mặn EC ({garden.ec.toFixed(2)}):</strong> Muối kết hợp với clo hình thành phức chất Cadmium hòa tan mạnh.</p>
                        <p>• <strong>Độ ẩm ({garden.moisture}%):</strong> Nước ngập làm rễ bị nghẹt oxy, làm suy yếu sức đề kháng của cây sầu riêng.</p>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[11px] font-semibold mt-1.5 text-right ${
                    isUser ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-[#2D7D46] px-4 py-3 bg-white rounded-2xl border border-emerald-200 w-fit shadow-xs animate-pulse">
            <Sparkles className="w-5 h-5 text-[#2D7D46] animate-spin" />
            <span>Trợ lý AI đang nghiên cứu dữ liệu vườn và soạn câu trả lời...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Farmer Quick Questions Suggestions Bar */}
      <div className="bg-white px-2.5 py-1.5 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 hidden xs:inline px-1">
          Hỏi nhanh:
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 active:bg-emerald-100 text-[#1A3D2B] border border-slate-200 font-bold text-xs shrink-0 whitespace-nowrap transition-all disabled:opacity-50 min-h-[36px]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 4. Large Clean Text Input Bar */}
      <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập thắc mắc bón vôi, xả mặn, giải pháp..."
          disabled={loading}
          className="flex-1 bg-slate-50 focus:bg-white border border-slate-300 focus:border-[#2D7D46] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 sm:w-11 sm:h-11 bg-[#2D7D46] hover:bg-emerald-700 active:scale-95 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all min-h-[40px] min-w-[40px]"
          title="Gửi câu hỏi"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* 5. User Profile Consultation History Modal */}
      {showHistoryModal && (
        <ConsultationHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}

      {/* 6. Custom Confirmation Modal for Clearing Chat Screen */}
      {showClearConfirmModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Làm mới màn hình trò chuyện?
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Chú có muốn cất giữ cuộc trò chuyện này vào <strong>Hồ sơ người dùng</strong> để theo dõi lâu dài trước khi làm mới không?
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => {
                  setShowClearConfirmModal(false);
                  handleArchiveAndReset();
                }}
                className="w-full py-3 px-3 bg-[#2D7D46] hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 min-h-[44px] shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Lưu vào Hồ Sơ & Làm Mới Chat</span>
              </button>

              <button
                onClick={handleDirectClearWithoutArchive}
                className="w-full py-3 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold text-xs sm:text-sm rounded-xl min-h-[44px]"
              >
                Làm mới màn hình (Không lưu)
              </button>

              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl min-h-[40px]"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



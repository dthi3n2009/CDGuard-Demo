import { Garden, ChatMessage } from '../types';
import { calculateCRS, getCRSInfo } from '../utils/crsCalculator';
import { findBasicFaqAnswer } from '../data/basicFaq';
import { askGemini } from './geminiService';

export const MANDATORY_DISCLAIMER = "\n\n⚠️ Lưu ý: CDGuard chỉ đánh giá nguy cơ từ điều kiện đất, không thay thế kết quả xét nghiệm Cadmium tại phòng thí nghiệm.";

/**
 * Uses Firebase AI on Android; preserves local answers if AI is unavailable.
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  garden: Garden
): Promise<string> {
  if (!message.trim()) return 'Bạn nhập câu hỏi nhé.';
  if (message.length > 2000) return 'Bạn rút gọn câu hỏi dưới 2.000 ký tự nhé.';
  try {
    const answer = await askGemini(message, history, garden);
    if (answer) return answer + MANDATORY_DISCLAIMER;
  } catch { /* Keep the offline knowledge available; never invent an AI response. */ }
  return offlineChatMessage(message, garden);
}

export function offlineChatMessage(message: string, garden: Garden): string {
  const basicAnswer = findBasicFaqAnswer(message);
  if (basicAnswer) return `**Kiến thức có sẵn · chưa dùng Gemini:** ${basicAnswer}` + MANDATORY_DISCLAIMER;

  const crs = calculateCRS(garden.ph, garden.ec, garden.moisture, garden.temperature);
  const crsInfo = getCRSInfo(crs, garden.ph, garden.ec, garden.moisture, garden.temperature);

  if (!garden.hasVerifiedReading) return 'Chưa có số đo được xác minh của vườn. Mình chưa thể đánh giá tình trạng đất. Bạn có thể hỏi kiến thức có sẵn hoặc kết nối trạm đo để trao đổi theo số đo thực tế.' + MANDATORY_DISCLAIMER;
  return 'Chế độ ngoại tuyến: câu trả lời theo quy tắc có sẵn, không phải phản hồi từ Gemini.\n\n' + generateRuleBasedResponse(message, garden, crs, crsInfo);
}

function generateRuleBasedResponse(
  query: string,
  garden: Garden,
  crs: number,
  crsInfo: any
): string {
  const q = query.toLowerCase();

  if (q.includes('vì sao') || q.includes('tại sao') || q.includes('nguyên nhân') || q.includes('cao')) {
    let text = `Chào chú/bác, chỉ số nguy cơ Cadmium (CRS) hiện tại của vườn **${garden.name}** ở mức **${crsInfo.levelText} (${crs}/100)**.\n\n`;
    if (crsInfo.rootCauses.length > 0) {
      text += `Các nguyên nhân chính tác động bao gồm:\n`;
      crsInfo.rootCauses.forEach((cause: string, i: number) => {
        text += `${i + 1}. ${cause}\n`;
      });
    } else {
      text += `Các chỉ số đất pH (${garden.ph}), EC (${garden.ec} dS/m), độ ẩm (${garden.moisture}%) hiện nằm trong dải tương đối an toàn.`;
    }
    return text + MANDATORY_DISCLAIMER;
  }

  if (q.includes('ph') || q.includes('chua') || q.includes('vôi')) {
    if (garden.ph < 5.5) {
      return `Hiện tại độ pH đất vườn đang là **${garden.ph.toFixed(1)}**, thuộc dải **đất chua mạnh (axit)**.\n\n` +
        `Sự axit hóa làm tăng hòa tan ion Cadmium tự do trong dung dịch đất. Rễ sầu riêng sẽ dễ bị hấp thụ nhầm Cadmium.\n\n` +
        `**Khuyến nghị:** Bón bổ sung vôi nông nghiệp (CaCO3) hoặc dolomite dải đều theo tán cây. Lượng tham khảo khoảng 20-30 kg/công. Rải sau mưa hoặc xới nhẹ trước khi tưới.` +
        MANDATORY_DISCLAIMER;
    } else {
      return `Mức pH đất hiện tại là **${garden.ph.toFixed(1)}**, nằm trong ngưỡng khá lý tưởng cho cây sầu riêng (khoảng 5.8 - 6.5).\n\n` +
        `Chú nên duy trì bón phân hữu cơ hoai mục và hạn chế lạm dụng phân hóa học chứa gốc clo hoặc lưu huỳnh làm chua đất.` +
        MANDATORY_DISCLAIMER;
    }
  }

  if (q.includes('ec') || q.includes('mặn') || q.includes('muối')) {
    if (garden.ec > 2.0) {
      return `Mức EC đất hiện tại là **${garden.ec.toFixed(2)} dS/m**, cao hơn ngưỡng an toàn (2.0 dS/m).\n\n` +
        `Tích tụ muối hoặc clo trong đất làm hình thành các phức chất Cadmium-Clorua hòa tan mạnh, tăng khả năng chuyển dịch của Cadmium.\n\n` +
        `**Xử lý:** Tưới xả mặn/xả muối bằng nước ngọt sông Tiền (EC < 0.5), tạm dừng bón phân hóa học đậm đặc trong 2 tuần.` +
        MANDATORY_DISCLAIMER;
    } else {
      return `Chỉ số EC hiện tại **${garden.ec.toFixed(2)} dS/m** rất an toàn. Không có dấu hiệu tích tụ muối hay nguy cơ xâm nhập mặn ở gốc.` +
        MANDATORY_DISCLAIMER;
    }
  }

  if (q.includes('việc cần làm ngay') || q.includes('xử lý') || q.includes('ngay')) {
    return `Các hành động ưu tiên khẩn cấp cho vườn sầu riêng **${garden.name}**:\n` +
      `1. **pH đất (${garden.ph}):** ${garden.ph < 5.5 ? 'Bón vôi CaCO3 cân bằng pH nâng lên mức 6.0.' : 'Đã ổn định.'}\n` +
      `2. **Độ ẩm (${garden.moisture}%):** ${garden.moisture > 80 ? 'Khai thông rãnh mương, rút nước đọng ở gốc sầu riêng.' : 'Tưới vừa đủ ẩm.'}\n` +
      `3. **Độ mặn/EC (${garden.ec} dS/m):** ${garden.ec > 2.0 ? 'Tưới xả muối bằng nước sông sạch.' : 'Bình thường.'}\n` +
      `4. **Bổ sung chất mùn:** Bón phân hữu cơ vi sinh chứa Axit Humic để cố định kim loại nặng.` +
      MANDATORY_DISCLAIMER;
  }

  if (q.includes('chi phí') || q.includes('tiền') || q.includes('giá')) {
    return `**Dự toán chi phí xử lý cải tạo đất (Tham khảo):**\n` +
      `- **Mức thấp (200.000 - 500.000đ/công):** Bón vôi nông nghiệp, tự xẻ rãnh thoát nước mương.\n` +
      `- **Mức trung bình (800.000 - 1.500.000đ/công):** Bổ sung phân hữu cơ vi sinh, Axit Humic, Trichoderma.\n` +
      `- **Dài hạn (2.000.000 - 4.000.000đ/vườn):** Xét nghiệm mẫu đất & lá chuyên sâu tại phòng thí nghiệm ICP-MS.` +
      MANDATORY_DISCLAIMER;
  }

  if (q.includes('xét nghiệm') || q.includes('mẫu') || q.includes('khi nào')) {
    return `Chú nên lấy mẫu đất gửi phòng thí nghiệm khi:\n` +
      `- Chỉ số nguy cơ CRS duy trì trên **50 - 80 (Cam/Đỏ)** liên tục trên 2 tuần.\n` +
      `- Chuẩn bị vào đợt thu hoạch trái sầu riêng thương phẩm xuất khẩu.\n` +
      `- Đất có lịch sử bị ngập mặn kéo dài hoặc dùng phân bón lót không rõ nguồn gốc.` +
      MANDATORY_DISCLAIMER;
  }

  // General response
  return `Chào chú! Vườn **${garden.name}** hiện có pH = ${garden.ph.toFixed(1)}, EC = ${garden.ec.toFixed(2)} dS/m, Độ ẩm = ${garden.moisture}%, Nhiệt độ = ${garden.temperature}°C. Chỉ số nguy cơ CRS là **${crs}/100 (${crsInfo.levelText})**.\n\nChú có thể hỏi con về cách nâng pH, hạ EC, xả mặn, hoặc các giải pháp hữu cơ cải tạo đất cho vườn sầu riêng.` +
    MANDATORY_DISCLAIMER;
}

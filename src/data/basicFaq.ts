export interface BasicFaqPair {
  question: string;
  keywords: string[];
  answer: string;
}

const topics: Array<{ keywords: string[]; label: string; answer: string }> = [
  { keywords: ['ph', 'chua'], label: 'pH đất thấp', answer: 'pH thấp làm đất chua. Đo lại ở 3 vị trí dưới tán, sau đó cân nhắc bón vôi hoặc dolomite theo khuyến cáo địa phương. Không bón vôi cùng lúc với phân đạm.' },
  { keywords: ['ph cao', 'kiềm'], label: 'pH đất cao', answer: 'Đất kiềm có thể làm cây khó hút một số vi lượng. Kiểm tra lại mẫu đất trước khi xử lý; ưu tiên phân hữu cơ hoai mục và tư vấn kỹ thuật tại địa phương.' },
  { keywords: ['ec', 'mặn', 'muối'], label: 'EC cao hoặc đất mặn', answer: 'EC cao thường liên quan muối hoặc phân tích tụ. Tạm giảm phân đậm đặc, kiểm tra EC nước tưới và xả bằng nước ngọt khi điều kiện thoát nước phù hợp.' },
  { keywords: ['ec thấp'], label: 'EC thấp', answer: 'EC thấp không tự động là xấu. Hãy xem cùng tình trạng lá, sinh trưởng và lịch bón phân; không nên tăng phân chỉ dựa vào một lần đo.' },
  { keywords: ['ẩm thấp', 'khô', 'thiếu nước'], label: 'độ ẩm thấp', answer: 'Đất khô làm rễ tơ hoạt động kém. Tưới từ từ quanh vùng rễ, phủ gốc bằng vật liệu hữu cơ và đo lại sau khi nước thấm đều.' },
  { keywords: ['ẩm cao', 'úng', 'ngập'], label: 'độ ẩm cao', answer: 'Đất quá ẩm làm rễ thiếu oxy. Kiểm tra rãnh, mương và chỗ đọng nước; chỉ tưới lại khi đất về ngưỡng phù hợp.' },
  { keywords: ['mưa', 'sau mưa'], label: 'sau mưa', answer: 'Sau mưa nên kiểm tra nước đọng, độ ẩm và pH tại vài gốc đại diện. Ghi nhãn lần đo là “Sau mưa” để so sánh đúng với dữ liệu trước mưa.' },
  { keywords: ['thoát nước', 'rãnh', 'mương'], label: 'thoát nước vườn', answer: 'Ưu tiên khơi thông rãnh, dọn điểm nghẽn và kiểm tra nước có rút khỏi gốc hay không. Sầu riêng không chịu úng kéo dài.' },
  { keywords: ['vôi', 'caco3'], label: 'bón vôi', answer: 'Bón vôi khi có cơ sở từ pH đất. Rải đều theo mép tán, không dồn sát gốc và cách các đợt bón phân chính để hạn chế thất thoát dinh dưỡng.' },
  { keywords: ['dolomite'], label: 'dolomite', answer: 'Dolomite có thể bổ sung canxi và magiê đồng thời hỗ trợ cải thiện đất chua. Liều dùng cần dựa vào pH, kết cấu đất và khuyến cáo kỹ thuật địa phương.' },
  { keywords: ['hữu cơ', 'compost'], label: 'phân hữu cơ', answer: 'Phân hữu cơ hoai mục giúp cải thiện cấu trúc đất và giữ ẩm. Chỉ dùng nguồn đã ủ kỹ, không bón quá sát cổ rễ.' },
  { keywords: ['humic'], label: 'Humic', answer: 'Humic là chất hỗ trợ cải tạo đất, không thay cho dinh dưỡng chính. Dùng đúng liều trên nhãn và theo dõi phản ứng của cây, đất.' },
  { keywords: ['trichoderma'], label: 'Trichoderma', answer: 'Trichoderma thường được dùng để hỗ trợ hệ vi sinh vùng rễ. Đất cần đủ ẩm nhưng không úng; không trộn tùy tiện với thuốc có thể làm giảm vi sinh có lợi.' },
  { keywords: ['nước tưới', 'nước'], label: 'nguồn nước tưới', answer: 'Nên kiểm tra pH và EC nước tưới trước khi bơm, đặc biệt lúc triều hoặc mùa khô. Nếu nước bất thường, tạm không tưới và lấy mẫu kiểm tra thêm.' },
  { keywords: ['cadmium', 'cd'], label: 'Cadmium', answer: 'Chỉ số đất chỉ giúp đánh giá nguy cơ, không xác định hàm lượng Cadmium trong quả hay đất. Muốn kết luận phải xét nghiệm tại phòng thí nghiệm đạt chuẩn.' },
  { keywords: ['crs', 'nguy cơ'], label: 'điểm CRS', answer: 'CRS là điểm tổng hợp điều kiện làm Cadmium dễ di chuyển trong đất. Xem CRS cùng pH, EC, độ ẩm, lịch mưa và kết quả xét nghiệm, không dùng riêng lẻ.' },
  { keywords: ['lấy mẫu', 'xét nghiệm', 'mẫu đất'], label: 'lấy mẫu đất', answer: 'Lấy nhiều điểm dưới tán đại diện, tránh điểm vừa bón phân hoặc vừa tưới. Trộn mẫu theo hướng dẫn của phòng xét nghiệm và ghi rõ vị trí, ngày lấy.' },
  { keywords: ['phân bón', 'npk'], label: 'phân bón', answer: 'Lập lịch bón phân theo giai đoạn cây, sức cây và kết quả đất. Không tăng liều chỉ vì thấy cây chậm; kiểm tra nước, rễ và sâu bệnh trước.' },
  { keywords: ['rễ', 'thối rễ'], label: 'rễ sầu riêng', answer: 'Rễ khỏe cần đất tơi, thoáng và ẩm vừa. Nếu nghi thối rễ, giảm úng trước, kiểm tra vùng cổ rễ và nhờ cán bộ kỹ thuật xác định nguyên nhân.' },
  { keywords: ['lá vàng', 'vàng lá'], label: 'lá vàng', answer: 'Lá vàng có nhiều nguyên nhân: nước, rễ, dinh dưỡng hoặc sâu bệnh. Hãy gửi ảnh rõ mặt lá, gốc cây và kèm số đo đất trước khi kết luận.' }
];

const starters = ['Vì sao', 'Cần làm gì khi', 'Cách xử lý', 'Khi nào cần kiểm tra', 'Lưu ý khi theo dõi'];

export const BASIC_FAQ_PAIRS: BasicFaqPair[] = topics.flatMap(topic =>
  starters.map(starter => ({ question: `${starter} ${topic.label}?`, keywords: topic.keywords, answer: topic.answer }))
);

export const BASIC_FAQ_QUESTIONS = BASIC_FAQ_PAIRS.map(pair => pair.question);

export function findBasicFaqAnswer(question: string): string | null {
  const normalized = question.toLocaleLowerCase('vi-VN');
  const match = BASIC_FAQ_PAIRS
    .map(pair => ({
      pair,
      score: pair.keywords.filter(keyword => keyword.length <= 2
        ? new RegExp(`(^|\\s)${keyword}(?=\\s|$)`, 'i').test(normalized)
        : normalized.includes(keyword)
      ).length
    }))
    .sort((a, b) => b.score - a.score)[0];
  return match?.score ? match.pair.answer : null;
}

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'CDGuard Pro', timestamp: Date.now() });
  });

  // AI Assistant Proxy Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, gardenInfo } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.json({
          fallback: true,
          text: `Hệ thống AI chưa nhận được khoá API. CDGuard Pro xin tư vấn dựa trên dữ liệu cảm biến thực tế của vườn ${gardenInfo?.name || 'sầu riêng'}:\n\n` +
            `• **pH đất (${gardenInfo?.ph ?? 5.4}):** ${gardenInfo?.ph < 5.5 ? 'Đất đang chua mạnh. Bón bổ sung vôi CaCO3 (20-30kg/công) dải đều theo tán cây.' : 'Đất ổn định.'}\n` +
            `• **Độ mặn EC (${gardenInfo?.ec ?? 2.15} dS/m):** ${gardenInfo?.ec > 2.0 ? 'Tích tụ muối cao. Cần tưới xả mặn bằng nước ngọt và tạm dừng bón phân đậm đặc.' : 'Nằm trong mức an toàn.'}\n` +
            `• **Độ ẩm (${gardenInfo?.moisture ?? 78}%):** ${gardenInfo?.moisture > 80 ? 'Khai thông rãnh thoát nước mương để rễ không bị nghẹt oxy.' : 'Độ ẩm đạt chuẩn.'}\n\n` +
            `Lưu ý: CDGuard chỉ đánh giá nguy cơ từ điều kiện đất, không thay thế kết quả xét nghiệm Cadmium tại phòng thí nghiệm.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `Bạn là Trợ lý AI Chuyên gia Nông nghiệp sầu riêng thuộc hệ thống CDGuard Pro (Đồng bằng sông Cửu Long).
Nhiệm vụ: Tư vấn kỹ thuật đất, phân bón, tưới tiêu và quản lý nguy cơ Cadmium (CRS) dựa trên dữ liệu cảm biến thực tế của vườn.

THÔNG TIN VƯỜN HIỆN TẠI:
- Tên vườn: ${gardenInfo?.name || 'Vườn sầu riêng'}
- Địa điểm: ${gardenInfo?.district || ''}, ${gardenInfo?.province || ''}
- Diện tích: ${gardenInfo?.area || 1} công đất
- Loại đất: ${gardenInfo?.soilType || 'đất phù sa'}
- Cây trồng: ${gardenInfo?.crop || 'sầu riêng'} (${gardenInfo?.age || 5} tuổi)
- pH đất hiện tại: ${gardenInfo?.ph ?? 5.4}
- EC đất hiện tại: ${gardenInfo?.ec ?? 2.15} dS/m
- Độ ẩm đất: ${gardenInfo?.moisture ?? 78}%
- Nhiệt độ đất: ${gardenInfo?.temperature ?? 29.5}°C
- Chỉ số nguy cơ Cadmium (CRS): ${gardenInfo?.crs ?? 50}/100 - Mức: ${gardenInfo?.levelText || 'Cảnh báo'}

QUY TẮC BẮT BUỘC KHI TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt thân thiện, rõ ràng, dễ hiểu với bà con nông dân.
2. Nêu nguyên nhân trực tiếp từ chỉ số pH, EC, độ ẩm hoặc nhiệt độ hiện tại.
3. Giải pháp đưa ra phải cụ thể (bón vôi, xả mặn, xẻ rãnh thoát nước, phân hữu cơ mùn,...) nhưng KHÔNG chốt liều lượng hóa chất tuyệt đối mà ghi rõ là mức tham khảo.
4. BẮT BUỘC kết thúc câu trả lời bằng lưu ý chính thức: "Lưu ý: CDGuard chỉ đánh giá nguy cơ từ điều kiện đất, không thay thế kết quả xét nghiệm Cadmium tại phòng thí nghiệm."`;

      // Build chat contents including recent dialog history
      const formattedContents: any[] = [];
      if (Array.isArray(history)) {
        history.slice(-6).forEach((h: any) => {
          formattedContents.push({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        });
      }

      formattedContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Try model calls with retry & model fallback to handle 503 high demand spikes gracefully
      const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
      let replyText: string | null = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: formattedContents,
              config: {
                systemInstruction,
                temperature: 0.7
              }
            });

            if (response && response.text) {
              replyText = response.text;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`[Gemini API] Attempt ${attempt} on model ${modelName} encountered error:`, err?.message || err);
            // Wait briefly before retrying on 503 / 429 transient errors
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 800 * attempt));
            }
          }
        }
        if (replyText) break;
      }

      if (replyText) {
        return res.json({ text: replyText });
      }

      // If all Gemini model attempts failed (e.g. 503 high demand), return 200 with fallback indicator
      console.warn('Gemini model service temporarily unavailable after retries:', lastError?.message);
      return res.json({
        fallback: true,
        text: `Hiện tại hệ thống AI đang có lượng truy cập cao. CDGuard Pro xin tư vấn dựa trên dữ liệu vườn ${gardenInfo?.name || 'của bạn'}:\n\n` +
          `• **pH đất (${gardenInfo?.ph ?? 5.4}):** ${gardenInfo?.ph < 5.5 ? 'Đất đang chua mạnh. Khuyến nghị bón bổ sung vôi CaCO3 (20-30kg/công) dải đều theo tán cây.' : 'Nằm trong ngưỡng an toàn.'}\n` +
          `• **Độ mặn EC (${gardenInfo?.ec ?? 2.15} dS/m):** ${gardenInfo?.ec > 2.0 ? 'EC cao do muối tích tụ. Cần tưới xả mặn bằng nước ngọt và ngưng bón phân hóa học đậm đặc.' : 'Nằm trong mức an toàn.'}\n` +
          `• **Độ ẩm (${gardenInfo?.moisture ?? 78}%):** ${gardenInfo?.moisture > 80 ? 'Đất úng nước. Khai thông rãnh thoát nước mương để gốc thoáng khí.' : 'Độ ẩm thích hợp.'}\n\n` +
          `Lưu ý: CDGuard chỉ đánh giá nguy cơ từ điều kiện đất, không thay thế kết quả xét nghiệm Cadmium tại phòng thí nghiệm.`
      });
    } catch (err: any) {
      console.error('Error handling /api/chat:', err);
      return res.status(500).json({
        error: 'AI_ERROR',
        message: err?.message || 'Có lỗi khi kết nối với Gemini AI server.'
      });
    }
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CDGuard Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

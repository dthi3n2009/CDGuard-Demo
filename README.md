# CDGuard Pro – Hệ Thống Giám Sát Nguy Cơ Cadmium Vườn Sầu Riêng ĐBSCL

CDGuard Pro là ứng dụng web PWA full-stack thông minh dành cho nông dân trồng sầu riêng tại Đồng bằng sông Cửu Long. Ứng dụng giúp theo dõi các chỉ số đất (pH, EC, độ ẩm, nhiệt độ) qua cảm biến IoT RS485 và tự động tính toán **Chỉ số nguy cơ Cadmium (CRS)** để đưa ra khuyến nghị cải tạo đất kịp thời.

> ⚠️ **Tuyên bố quan trọng:** CDGuard Pro chỉ đánh giá nguy cơ dựa trên điều kiện môi trường đất (pH, EC, độ ẩm, nhiệt độ), không thay thế kết quả xét nghiệm định lượng Cadmium tại phòng thí nghiệm chuyên sâu.

---

## 1. Hướng Dẫn Chạy Ứng Dụng (Development & Production)

### Yêu cầu môi trường
- Node.js version 18+ hoặc 20+
- npm hoặc yarn

### Các bước khởi chạy cục bộ
1. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```

2. Chạy ứng dụng trong môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ `http://localhost:3000`.

3. Biên dịch cho Production:
   ```bash
   npm run build
   ```

4. Chạy server Production (Express + esbuild CommonJS bundle):
   ```bash
   npm run start
   ```

---

## 2. Cách Cấu Hình Firebase Realtime Database & Auth

Ứng dụng mặc định kết nối với Firebase Realtime Database của dự án:
- **Project ID:** `cdguard-7700a`
- **Database URL:** `https://cdguard-7700a-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Nhánh dữ liệu:** `/data`

Nếu muốn kết nối với dự án Firebase riêng của bạn, tạo hoặc cập nhật file `.env`:

```env
VITE_FIREBASE_API_KEY="AIzaSyYourApiKeyHere"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="your-project"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abc123def456"
```

---

## 3. Cách Cấu Hình Google Login (Firebase Authentication)

1. Mở [Firebase Console](https://console.firebase.google.com/) -> Chọn dự án của bạn.
2. Mới mục **Authentication** -> **Sign-in method** -> Bật phương thức **Google**.
3. Điền thông tin Email hỗ trợ và lưu.
4. Mới mục **Authorized domains** -> Thêm tên miền ứng dụng (ví dụ: `localhost` hoặc tên miền Cloud Run preview).
5. Khi người dùng bấm nút **"Đăng nhập với Google"**, ứng dụng sẽ gọi `signInWithPopup`. Nếu chưa có API Key, ứng dụng sẽ hiện thông báo thân thiện và tự động cho phép dùng tiếp chế độ Demo.

---

## 4. Cách Cấu Hình Gemini AI Assistant

Trợ lý AI được xây dựng qua endpoint bảo mật server-side `/api/chat` sử dụng SDK `@google/genai` mới nhất với model `gemini-3.6-flash`.

Cấu hình khóa bí mật trong file `.env` hoặc Bảng điều khiển Secrets của AI Studio:

```env
GEMINI_API_KEY="AIzaSyYourGeminiKey"
```

- **Mạch hoạt động:** Khóa API chỉ nằm ở phía Backend Express, tuyệt đối không lộ ra trình duyệt Client.
- **Dự phòng (Fallback):** Nếu chưa điền `GEMINI_API_KEY`, hệ thống tự động chuyển sang bộ quy tắc AI nội bộ thông minh để trả lời các câu hỏi nông nghiệp sầu riêng mà không gây gián đoạn trải nghiệm.

---

## 5. Cách Chuyển Từ Demo Sang Dữ Liệu Thực Tế

1. **Trên thiết bị cứng (Hardware):**
   - Cảm biến đất RS485 4-in-1 (đo pH, EC µS/cm, độ ẩm %, nhiệt độ °C).
   - Vi điều khiển ESP32 đọc cảm biến qua chuẩn Modbus RS485.
   - Module SIM 4G A7680C gửi bản ghi JSON lên Firebase Realtime Database tại nhánh `/data`.
   - Quy đổi EC: Cảm biến gửi đơn vị µS/cm (ví dụ `2150`), phần mềm tự động quy đổi sang dS/m (`2150 / 1000 = 2.15 dS/m`).

2. **Cấu trúc bản ghi JSON gửi lên Firebase:**
   ```json
   {
     "device_id": "esp32-01",
     "ts": 1786200000000,
     "values": {
       "ph": 5.4,
       "ec": 2150,
       "moisture": 78.5,
       "temp": 29.6
     }
   }
   ```

3. **Giao diện CDGuard Pro:**
   - Vào bước 3 của **Onboarding** hoặc tab **Thiết bị**.
   - Nhập Mã trạm (Device ID) là `esp32-01`.
   - Bấm **"Kiểm tra kết nối"** hoặc **"Đồng bộ ngay"**. Hệ thống sẽ tự động chuyển từ dữ liệu demo sang dữ liệu thực tế từ trạm cảm biến.

---

## 6. Hướng Dẫn Deploy (Triển Khai)

Ứng dụng sẵn sàng deploy lên Google Cloud Run, Vercel, Render hoặc Docker container:

```bash
# Lệnh build gói hoàn chỉnh
npm run build

# Khởi chạy server đơn Express CommonJS bundle
npm run start
```

---

## 7. Tổng Kết Các Chức Năng Đã Hoàn Thành

1. ✅ **Công thức CRS chuẩn (Pure TypeScript):** Đã cài đặt đúng công thức và kiểm thử tự động (6 Unit tests pass 100%).
2. ✅ **Đăng nhập 3 chế độ:** Google Auth, Dùng thử Demo, và Dev Mode có bảng điều khiển thử nghiệm.
3. ✅ **Onboarding 3 bước:** Lưu thông tin tỉnh ĐBSCL, giống sầu riêng (Ri6/Monthong), quy mô công đất và mã thiết bị.
4. ✅ **Tab Tổng quan:** Đồng hồ CRS lớn, 4 thẻ cảm biến (pH, EC dS/m, độ ẩm, nhiệt độ), phân tích tác nhân gây nguy cơ.
5. ✅ **Tab Xu hướng:** Biểu đồ Recharts responsive phân tích 24h, 7 ngày, 30 ngày, 90 ngày.
6. ✅ **Tab Xử lý:** Lộ trình cải tạo đất theo mốc thời gian và mức chi phí (bón vôi CaCO3, xả mặn, xẻ rãnh, phân hữu cơ mùn).
7. ✅ **Tab Trợ lý AI:** Chat tiếng Việt, câu hỏi gợi ý, đọc giọng nói SpeechSynthesis, tích hợp Gemini API server-side.
8. ✅ **Tab Thiết bị:** Quản lý trạm IoT, trạng thái pin, tín hiệu 4G, sơ đồ kiến trúc phần cứng.
9. ✅ **Dev Mode Panel:** Cho phép kéo slider thử nghiệm pH, EC, độ ẩm, nhiệt độ, giả lập tình huống Xanh/Vàng/Cam/Đỏ và chạy Unit tests trực tiếp.

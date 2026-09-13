# CDGuard — Giám sát đất vườn sầu riêng

CDGuard là ứng dụng Android hỗ trợ theo dõi pH, EC, độ ẩm, nhiệt độ đất và Chỉ số nguy cơ Cadmium (CRS) cho từng cây sầu riêng.

> CRS là chỉ số sàng lọc nguy cơ từ điều kiện đất, không phải kết quả định lượng Cadmium. Xác nhận Cadmium cần xét nghiệm đất tại phòng thí nghiệm.

## Trải nghiệm cho ban giám khảo

| Nội dung | Liên kết |
|---|---|
| Bản demo trực tuyến | [Mở CDGuard trên Appetize](https://appetize.io/app/b_zt3vh3sqd7dmhu7d4f46rci3sm) |
| Dữ liệu mẫu trực quan | [Mở dữ liệu mẫu](https://drive.google.com/file/d/1YrlQC1vrvxDe5pwyGGc8nr3bWXYJKxtg/view?usp=drivesdk) |
| Firebase dữ liệu thô | [Xem JSON](https://cdguard-7700a-default-rtdb.asia-southeast1.firebasedatabase.app/data.json) |
| Lịch sử phát triển | [CHANGELOG.md](CHANGELOG.md) |

## Tính năng hiện có

- Quản lý nhiều vườn, cây và vị trí đo.
- Đo mô phỏng không cần phần cứng cho phiên bản demo; quy trình khảo sát tự chuyển điểm/cây.
- Lưu pH, EC, độ ẩm, nhiệt độ và CRS theo từng cây; xem lịch sử và tổng hợp vườn.
- CRS 4 mức: Xanh, Vàng, Cam, Đỏ.
- Trợ lý CDGuard có 100 cặp hỏi–đáp hoạt động khi không có mạng.
- Hỗ trợ luồng Firebase/ESP32 cho phiên bản thiết bị thật.

## Chạy và build

Yêu cầu: Node.js 18+, Android SDK và JDK 21.

```bash
npm install
npm run build
npx cap sync android
cd android
gradlew.bat assembleDebug
```

APK sau khi build: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Gemini

Không đưa API key vào GitHub hoặc APK công khai. Muốn dùng Gemini khi phát triển cục bộ, tạo file `.env.local` (không commit):

```text
VITE_GEMINI_API_KEY="YOUR_KEY"
```

Khi chưa có key hoặc mất mạng, chatbot tự chuyển sang bộ kiến thức có sẵn.

## Dữ liệu và hướng phát triển

- Vườn mẫu Phi Yến, Phong Điền, Cần Thơ và bộ dữ liệu lịch sử được lưu trong `src/data/`.
- XGBoost + SHAP là hướng phát triển sau khi có dữ liệu đối chiếu phòng thí nghiệm.
- Gemini dùng để diễn giải câu hỏi mở, không thay thế chuyên gia nông nghiệp hay xét nghiệm Cadmium.

## Nhóm dự thi

- Nguyễn Phúc Duy Thiên — lớp 12T3
- Dương Hoàng Thiên Đăng — lớp 11T2

Trường THPT FPT Cần Thơ · Samsung Solve for Tomorrow · Dự án CDGuard.

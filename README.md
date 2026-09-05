# CDGuard – Giám sát đất vườn sầu riêng

CDGuard là ứng dụng Android hỗ trợ theo dõi pH, EC, độ ẩm và nhiệt độ đất cho vườn sầu riêng. Ứng dụng giúp lưu số đo theo từng cây, tổng hợp theo toàn vườn và hiển thị chỉ số nguy cơ Cadmium (CRS) để người dùng theo dõi điều kiện đất.

> Lưu ý: CRS chỉ là chỉ số đánh giá nguy cơ từ điều kiện đất. Ứng dụng không thay thế kết quả xét nghiệm Cadmium tại phòng thí nghiệm.

## Tính năng hiện có

- APK Android cài trực tiếp trên điện thoại.
- Quản lý nhiều vườn, thêm/xóa cây và sơ đồ cây theo hàng.
- Cây mới luôn ở trạng thái **chưa có số đo**; app không tự gán pH, CRS hoặc cảnh báo.
- Lưu và xem lịch sử pH, EC, độ ẩm, nhiệt độ theo cây và theo vườn.
- Vườn mẫu Phi Yến tại Phong Điền, Cần Thơ: 15 cây, dữ liệu ngày 05/09 với nhãn Trước mưa/Sau mưa.
- Hỗ trợ dữ liệu trạm Firebase; một bản ghi realtime chỉ được nhận khi được gắn đúng tên cây trong vườn.
- Trợ lý CDGuard có 100 bộ hỏi–đáp cơ bản, hoạt động khi không có mạng/API.
- Nhận diện CaGuard trên màn mở đầu, thanh ứng dụng và biểu tượng APK.

## Cài APK

Sau khi build, file nằm tại:

`android/app/build/outputs/apk/debug/app-debug.apk`

Trên điện thoại Android, tải file APK, cho phép cài đặt từ nguồn này khi hệ thống hỏi, sau đó cài đè phiên bản cũ.

## Chạy và build từ mã nguồn

Yêu cầu Node.js 18+ và Android SDK/JDK tương thích.

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Trên Windows, có thể dùng `gradlew.bat assembleDebug` trong thư mục `android`.

## Firebase realtime

CDGuard chỉ sử dụng dữ liệu Firebase khi bản ghi có mã trạm đúng và tên cây trùng với cây đã tạo trong app. Đây là cách tránh lấy nhầm số đo của cây/vườn khác.

Mẫu dữ liệu nên có các trường pH, EC, độ ẩm, nhiệt độ, mã trạm, thời gian và tên cây. Không gắn tên cây thì app sẽ giữ trạng thái **Chưa gán cây**, không tự tạo cảnh báo.

## Trợ lý AI

APK hiện có bộ kiến thức nội bộ gồm 100 cặp hỏi–đáp cho các chủ đề pH, EC, nước tưới, úng, rễ, phân bón, CRS và lấy mẫu đất.

Muốn dùng mô hình GPT/Gemini trực tiếp, cần một máy chủ trung gian có API key. Không đặt API key trong APK vì người khác có thể trích xuất và sử dụng khóa đó. Endpoint `/api/chat` đã là vị trí phù hợp để kết nối mô hình sau này.

## Lịch sử thay đổi

### 1.12 — 06/09/2026

- Thay nhận diện ứng dụng bằng logo CaGuard.
- Xuất icon Android theo các kích thước cần thiết.

### 1.11 — 06/09/2026

- Thêm 100 cặp hỏi–đáp cơ bản cho Trợ lý CDGuard, dùng được offline.

### 1.10 — 06/09/2026

- Cây mới không còn kế thừa pH/CRS cũ.
- Không hiện cảnh báo cho cây chưa có số đo.

### 1.9 — 06/09/2026

- Sửa nút thêm cây đầu tiên.
- Chặn số đo Firebase chưa gắn đúng tên cây.

### 1.8 — 06/09/2026

- Thêm cố định vườn Phi Yến vào danh sách vườn.
- Cập nhật địa chỉ Phong Điền, Cần Thơ.

## Ghi nhận phát triển

Dự án được xác định yêu cầu và kiểm tra bởi chủ dự án; các cập nhật mã nguồn gần đây có sự hỗ trợ của Codex (GPT). Mọi kết quả khuyến nghị nông nghiệp vẫn cần được người dùng và cán bộ chuyên môn đối chiếu trước khi áp dụng.

## Tác giả

- Nguyễn Phúc Duy Thiên
- Dương Hoàng Thiên Đăng

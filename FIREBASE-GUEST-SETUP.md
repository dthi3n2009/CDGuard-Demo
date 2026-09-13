# Khách lưu vườn trên Firebase — CDGuard 1.15

Ứng dụng Android tạo hoặc dùng lại tài khoản Firebase ẩn danh của thiết bị. Không cần Google. Đăng nhập thật sẵn có được giữ lại.

## Phần máy chủ cần hoàn tất

1. Mở dự án `cdguard-7700a` trong Firebase Console, khởi tạo Authentication nếu chưa có; bật Sign-in method → Anonymous.
2. Trong Realtime Database Rules, thêm nhánh `users/$uid` từ `firebase-guest-rules.example.json` vào rules hiện tại. Không thay thế/xóa rules của ESP32 hoặc các nhánh khác. Không mở read/write công khai toàn database.
3. Trên app bấm **Đồng bộ vườn**. Chỉ khi máy chủ trả thành công, app mới báo đã lưu Firebase.

Kiểm tra ngày 06/09/2026: API đăng nhập khách trả CONFIGURATION_NOT_FOUND. Chưa kiểm chứng đăng nhập và ghi cloud thực tế thành công, chưa triển khai rules mẫu.

## Dữ liệu

- `/users/<uid>/garden_backup`: ảnh chụp danh sách vườn, cây và lịch sử đang lưu trên thiết bị, cùng thời gian sao lưu. Chỉ sao lưu, chưa tự khôi phục từ cloud trên thiết bị mới.
- `/users/<uid>/tree_measurements/<garden-key>/<tree-key>/<reading-id>`: số đo lưu bằng nút lưu cây, dùng ID ổn định để gửi lại không tạo trùng.
- Cây và vườn được mã hóa khóa khi lưu số đo; bản ghi vẫn chứa gardenId/spotId ban đầu.
- Tự thử lại khi có mạng, khi vườn/cây thay đổi, hoặc mỗi 30 giây khi giao diện chính đang mở. Không đồng bộ nền khi app bị đóng.
- Khách phải giữ dữ liệu ứng dụng để giữ danh tính ẩn danh; gỡ app/xóa dữ liệu có thể mất quyền truy cập tài khoản khách cũ.
- Không thay đổi thời gian đo, không tạo dữ liệu đo thử trên máy chủ.

Tài liệu: https://firebase.google.com/docs/auth/web/anonymous-auth

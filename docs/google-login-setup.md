# Bật đăng nhập Google thật trên Android

Luồng nhập Gmail tự xác nhận đã được bỏ. App chỉ chấp nhận tài khoản do Firebase Authentication trả về.

Để hoàn tất bản Android `com.cdguard.app` trong dự án Firebase `cdguard-7700a`:

Chứng chỉ APK thử hiện tại (debug, đã kiểm tra ngày 05/09/2026):

- SHA-1: `E5:EF:DB:FB:D2:06:8A:B5:38:88:DF:DC:7F:BA:7F:68:0F:50:A7:82`
- SHA-256: `08:5F:FB:97:2E:01:DB:4F:17:EE:B4:00:8B:2C:F7:7E:6A:8C:39:A7:A8:6A:1E:7D:03:E2:3E:0A:D2:35:C1:80`

1. Thêm ứng dụng Android với package `com.cdguard.app` trong Firebase Console.
2. Thêm SHA-1 và SHA-256 của chứng chỉ ký APK hiện tại. Bản phát hành Google Play cần thêm chứng chỉ App Signing của Google Play.
3. Bật Authentication → Sign-in method → Google và chọn email hỗ trợ.
4. Tải `google-services.json` mới, đặt vào `android/app/google-services.json`. File cần chứa OAuth web client (client_type 3).
5. Chạy lại bản dựng web, `npx cap sync android`, rồi dựng APK. Cấu hình Capacitor chỉ đóng gói plugin đăng nhập native khi có file này để không làm app lỗi khởi động lúc thiếu cấu hình.
6. Thử trên điện thoại: chọn tài khoản Google, hủy đăng nhập, đăng xuất, mở lại app. Không coi việc biên dịch thành công là đã kiểm tra đăng nhập thật.

Bản web cần các biến `VITE_FIREBASE_*` trong `.env.local`, Google provider và Authorized domains phù hợp.

Không cần mật khẩu Google hay khóa tài khoản dịch vụ. Đăng nhập không tự tạo cơ chế đồng bộ dữ liệu vườn theo từng tài khoản; dữ liệu vườn hiện vẫn được lưu trên máy.

Nguồn: https://firebase.google.com/docs/auth/android/google-signin

Tích hợp Capacitor: https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md

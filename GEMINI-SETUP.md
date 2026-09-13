# CDGuard 1.19 – Firebase AI Logic

## Đã thực hiện

- Firebase Console dự án `cdguard-7700a`: đã bật Gemini Developer API và hoàn tất AI Logic setup theo chấp thuận của chủ tài khoản.
- Không nâng cấp gói thanh toán. Không bật AI monitoring tùy chọn. Không đổi Realtime Database Rules.
- Android gọi `gemini-3.8-flash` qua SDK Firebase AI, không nhúng Gemini API key.
- Chỉ gửi câu hỏi, tối đa 6 tin gần nhất trong phiên cùng vườn, loại cây/đất, tuổi cây và số đo được xác minh. Không chủ động gửi tên vườn, tọa độ hay tài khoản.
- Phân biệt rõ phản hồi Gemini và bộ kiến thức có sẵn. Không có kết quả AI thì không giả lập phản hồi Gemini.
- Không huấn luyện/fine-tune mô hình riêng, chưa triển khai RAG hoặc tra cứu nguồn trực tuyến. System instruction giới hạn phạm vi tư vấn; không đảm bảo AI luôn chính xác.
- CRS vẫn là quy tắc thử nghiệm, không phải xác suất nhiễm Cd hoặc hàm lượng Cd. Không thay thế xét nghiệm.

## Bước bắt buộc còn lại

Firebase tự bật enforcement App Check cho AI Logic. **Chưa có điện thoại kết nối để đăng ký token của bản thử nghiệm và thử yêu cầu Gemini thật.**

1. Cài APK debug 1.19 trên điện thoại, nối USB và bật Gỡ lỗi USB.
2. Mở CDGuard, vào Trợ lý. SDK tạo debug token riêng cho cài đặt đó; xem dòng `DebugAppCheckProvider` trong Logcat và giữ bí mật token.
3. Firebase Console → App Check → Apps → CDGuard Android → Manage debug tokens: đăng ký token của thiết bị thử nghiệm. Không tắt enforcement.
4. Gửi câu hỏi thử không chứa thông tin riêng tư. Xác nhận nhãn `Gemini · gemini-3.8-flash`, có nội dung trả lời thật; thử ngắt mạng để xác nhận fallback.

Không đưa debug token vào source/APK hoặc chia sẻ công khai. APK debug chỉ dùng thử nghiệm trên thiết bị được cho phép. Để phát hành đại trà: ký bản release và đăng ký Play Integrity tương ứng với kênh phân phối. Bản release dùng Play Integrity, không chứa debug provider. Chưa cấu hình và chưa kiểm thử phát hành đại trà trong lần này.

## File thay đổi

- `android/app/build.gradle`: SDK AI, App Check, phiên bản 1.19.
- `android/app/src/main/java/com/cdguard/app/MainActivity.java`: đăng ký cầu nối.
- `android/app/src/main/java/com/cdguard/app/CDGuardAIPlugin.java`: gọi AI ở luồng nền, khóa request trùng, giới hạn chờ 35 giây, giới hạn đầu vào/đầu ra và chỉ dẫn hệ thống.
- `android/app/src/debug/java/com/cdguard/app/AppCheckSetup.java`: xác thực bản thử nghiệm.
- `android/app/src/release/java/com/cdguard/app/AppCheckSetup.java`: xác thực bản phát hành.
- `src/services/geminiContext.ts`: lọc/giới hạn ngữ cảnh và số đo.
- `src/services/geminiService.ts`: cầu nối TypeScript → Android.
- `src/services/aiService.ts`: ưu tiên Gemini, fallback offline.
- `src/views/AIAssistantTab.tsx`: tránh trả lời muộn vào vườn khác/phiên đã xóa, thông báo dữ liệu gửi AI.
- `tests/gemini-context.test.ts`: kiểm thử ngữ cảnh, giới hạn, đơn vị và dữ liệu lỗi.
- Tài nguyên web Android được cập nhật khi build/copy.

## Kiểm tra và chạy

Kết quả lần này: TypeScript, 4 bộ kiểm thử (ngữ cảnh Gemini, 100 câu offline, đọc realtime, lưu cây) đều PASS; Vite build, Android assembleDebug và compileReleaseJavaWithJavac thành công. Chưa thực hiện request Gemini thật do chưa có thiết bị App Check được đăng ký. Build còn cảnh báo kích thước bundle web lớn và cảnh báo thư viện phụ thuộc, không làm build thất bại.

APK thử nghiệm: `C:/Users/duyth/cdguard-iot/outputs/CDGuard-1.19-gemini-appcheck-test.apk`.

Trong thư mục `CDGuard-source`:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/tsx/dist/cli.mjs tests/gemini-context.test.ts
node node_modules/tsx/dist/cli.mjs tests/offline-chat.test.ts
node node_modules/tsx/dist/cli.mjs tests/realtime-reading.test.ts
node node_modules/tsx/dist/cli.mjs tests/save-realtime-tree.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@capacitor/cli/bin/capacitor copy android
```

Sau đó chạy Gradle `:app:assembleDebug` trong dự án Android bằng JDK 21. Cài APK bằng trình cài đặt Android hoặc `adb install -r` khi đã cho phép máy tính. Không cần gỡ bản cũ, tránh mất dữ liệu lưu trên máy.

Bản web tiếp tục dùng kiến thức có sẵn; tích hợp Gemini lần này dành cho APK Android. Nếu API chưa được xác thực, mất mạng, hết quota hoặc trả lỗi thì dùng fallback, không báo đã kết nối thành công.

## Tài liệu chính thức

- https://firebase.google.com/docs/ai-logic/get-started?platform=android
- https://firebase.google.com/docs/ai-logic/models
- https://firebase.google.com/docs/app-check/android/debug-provider
- https://firebase.google.com/docs/app-check/android/play-integrity-provider

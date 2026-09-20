# Nhật ký phiên bản

## v1.9 — Đăng nhập bằng email và mật khẩu

**Bỏ magic link.** Cách cũ gửi một đường liên kết qua email, nghe thì tiện nhưng có bốn chỗ hỏng được: phải cấu hình Redirect URL đúng tuyệt đối, email dễ rơi vào hộp thư rác, liên kết bắt buộc mở trên đúng thiết bị vừa nhập email, và hạn mức gửi email miễn phí của Supabase khá thấp.

**Một màn hình, hai chế độ.** Thanh gạt Đăng nhập / Tạo tài khoản ở trên, dưới là ô email và ô mật khẩu có nút Hiện để xem lại thứ vừa gõ. Nút chỉ sáng khi đã nhập đủ và mật khẩu từ 6 ký tự.

**Thông báo lỗi bằng tiếng Việt.** Supabase trả lỗi bằng tiếng Anh kỹ thuật. Nay mỗi lỗi thường gặp được dịch sang câu nói rõ phải làm gì: sai mật khẩu, email đã có tài khoản, mật khẩu quá ngắn, chưa xác nhận email, thử quá nhiều lần. Lỗi lạ thì giữ nguyên nguyên văn để không giấu thông tin khi cần tra cứu.

**Vẫn chạy được khi Supabase bật xác nhận email.** Tạo tài khoản xong mà chưa có phiên đăng nhập thì app hiểu là cần xác nhận, báo rõ và tự chuyển về chế độ Đăng nhập.

## v1.8 — Thiếu cấu hình không còn làm sập site

**Lỗi cũ.** Middleware chạy trước mọi request để kiểm tra đăng nhập. Nó gọi Supabase bằng hai biến môi trường mà không kiểm tra xem chúng có tồn tại không. Thiếu một biến là thư viện ném lỗi, middleware sập, và vì nó chặn mọi đường vào nên toàn bộ site trả về `500 MIDDLEWARE_INVOCATION_FAILED` — người dùng chỉ thấy trang trắng, không biết chuyện gì xảy ra.

**Kiểm tra cấu hình trước khi gọi.** Thiếu biến, địa chỉ sai dạng, hay khoá dán thiếu ký tự đều bị bắt ngay và nói rõ biến nào có vấn đề. Dấu cách thừa hai đầu và dấu gạch chéo cuối địa chỉ được chấp nhận, vì đó là hai lỗi copy-paste thường gặp nhất.

**Trang `/setup`.** Cấu hình chưa xong thì app chuyển tới trang này thay vì trả lỗi 500. Trang liệt kê đủ ba biến cần có, chỉ rõ lấy từng cái ở đâu, và nhắc rằng thêm biến xong phải Redeploy thì bản đang chạy mới nhận.

**Bọc middleware trong try/catch.** Supabase có trục trặc thì request vẫn đi tiếp thay vì cả site trả 500.

## v1.7 — Đổi tên thành Verso

Tên cũ RevEng có hai vấn đề: người Việt đọc không thuận miệng, và với dân kỹ thuật thì "reverse engineering" là chuyện hoàn toàn khác.

Verso là mặt sau của một trang sách, gốc chữ "vers" nghĩa là xoay, lật — đúng tinh thần lật ngược chiều dịch, lại gắn với sách vở là thứ nạp vào app.

Đổi ở toàn bộ: tiêu đề trang, manifest PWA, tên hiện dưới icon trên màn hình chính, tên project, README, và các khoá lưu trên máy (`reveng:` thành `verso:`).

## v1.6 — Xem cả năm, và chế độ sáng tối

**Lịch có thêm chế độ xem cả năm.** Thanh gạt Tháng / Cả năm ở đầu lịch. Chế độ cả năm xếp 12 tháng thu nhỏ thành ba cột, mỗi tháng là một lưới chấm nhỏ cho thấy ngay tháng nào chăm tháng nào lười, kèm số ngày đã học. Bấm vào một tháng là nhảy sang xem chi tiết tháng đó.

**Đi lại tự do trong năm.** Trước đây chỉ lùi được về quá khứ. Nay đi tới lui thoải mái giữa các tháng và các năm, nên xem đủ 12 tháng của 2026 hay bất kỳ năm nào cũng được. Dưới lịch có dòng tổng kết theo tháng hoặc theo cả năm tuỳ chế độ đang xem.

**Chế độ sáng và tối.** Ba lựa chọn ở cuối trang Tiến độ: Tự động, Sáng, Tối. Tự động là theo cài đặt của điện thoại, nên tối đến máy chuyển nền tối thì app chuyển theo. Chọn tay thì app nhớ và giữ nguyên.

Bảng tối giữ đúng tinh thần ấm của bảng sáng: nền nâu đen chứ không xám lạnh, cam sáng hơn một bậc để nổi trên nền tối, tím oải hương nhạt hơn cho dễ đọc.

**Không nháy sáng khi mở app.** Một đoạn script nhỏ chạy trước khi trang vẽ, đọc lựa chọn đã lưu rồi áp ngay. Màu thanh trạng thái của trình duyệt cũng đổi theo.

**Toàn bộ màu chuyển sang biến CSS.** Trước đây màu ghi cứng trong cấu hình Tailwind nên không thể có hai bảng. Nay mỗi màu là một biến, đổi bảng chỉ là đổi giá trị biến, không phải viết hai bộ lớp cho mọi thành phần.

## v1.5 — Lịch tháng thay cho lưới ô vuông

**Thay lưới kiểu GitHub bằng lịch tháng thật.** Lưới cũ xếp 12 tuần thành các cột dọc, không có số ngày, không thẳng hàng theo thứ, nên nhìn rối và không biết ô nào là ngày nào.

Lịch mới có đủ những thứ một cuốn lịch cần: tên tháng và năm ở trên, hàng thứ T2 đến CN, mỗi ngày là một ô tròn có số ngày bên trong. Tuần bắt đầu từ thứ Hai theo thói quen Việt Nam.

**Đọc được ngay mức độ chăm.** Ngày chưa học để nền be nhạt, học ít thì cam nhạt, học vừa thì cam đậm, học nhiều thì cam đặc. Hôm nay có viền tròn bao quanh. Ngày trong tương lai mờ đi.

**Xem lại tháng cũ.** Hai nút mũi tên để lùi về các tháng trước; không cho đi tới tương lai. Dưới lịch có dòng tổng kết số ngày đã học và số câu trong tháng đang xem.

**Nới dữ liệu lấy về** từ 90 ngày lên 400 ngày để lật lịch về trước không bị trống.

## v1.4 — Giao diện mới, nạp bằng text

**Đổi hẳn hướng thiết kế.** Từ nền tối xanh đen sang nền sáng ấm: be chuyển sắc phớt hồng và tím, thẻ trắng bo góc lớn có bóng đổ mềm, cam làm màu chủ đạo, tím oải hương làm màu phụ cho bản gốc và lưới streak. Font đổi sang Nunito — bo tròn, thân thiện, hiển thị dấu tiếng Việt tốt.

**Thêm nhân vật.** Một khối tròn hai tai vẽ bằng SVG, ba biểu cảm: bình thường, buồn ngủ khi chưa có bài, và vui khi đạt mốc. Dùng ở màn hình đăng nhập, trạng thái trống và thông báo huy hiệu. Icon app cũng vẽ lại theo nhân vật này.

**Nạp tài liệu bằng cách dán văn bản.** Hai ô riêng cho bản tiếng Anh và bản tiếng Việt, đặt cạnh đường nạp bằng ảnh, chọn bằng thanh gạt ở đầu màn hình. Mặc định vẫn gửi qua model để tách câu, trích cụm từ đáng học và ghép cặp — giống hệt đường nạp ảnh, chỉ khác nguồn đầu vào.

**Ô tick "giữ nguyên, không tách".** Cả đoạn thành đúng một bản ghi ở mức Đoạn. Không gọi model nên tức thì và không tốn hạn mức.

**Sửa lỗi điều hướng ở bản demo.** Vào Thư viện hoặc Tiến độ rồi không có đường quay lại màn hình luyện. Mã nguồn app thật vốn đã có nút quay về, lỗi này phát sinh lúc gộp app thành một file HTML để thử trong chat.

## v1.3 — Chọn được nhà cung cấp model

**App chạy được miễn phí.** Thêm hỗ trợ Gemini bên cạnh Claude. Gemini có bậc miễn phí vĩnh viễn, không cần thẻ tín dụng, hạn mức thừa cho một người học. Đặt `GEMINI_API_KEY` là xong.

**Tách lớp gọi model.** Toàn bộ phần gọi model gom vào `src/lib/ai/`, hai route chỉ mô tả việc cần làm chứ không biết đang nói chuyện với ai. Thêm nhà cung cấp thứ ba sau này chỉ cần viết một file.

**Chỉ định riêng cho từng việc.** App cần model làm hai việc khác nhau: đọc ảnh và chấm bài. Đọc chữ tiếng Việt có dấu từ ảnh khó hơn chấm một câu dịch, nên hai việc này chọn nhà cung cấp và model riêng được qua biến môi trường, không đụng vào code.

**Bóc JSON chắc tay hơn.** Model hay bọc JSON trong rào markdown hoặc thêm lời dẫn dù đã dặn đừng. Bộ bóc mới xử lý được rào, lời dẫn đầu, chữ thừa đuôi, và chuỗi có chứa dấu ngoặc. Có 8 test riêng cho phần này.

**Gọi Gemini bằng REST thuần,** không thêm thư viện. Bật `responseMimeType: application/json` để model trả JSON thẳng. Bắt riêng lỗi vượt hạn mức và lỗi bị chặn nội dung để báo cho người dùng biết chuyện gì xảy ra.

**Không có khoá model thì app vẫn chạy.** Trước đây thiếu khoá là route trả lỗi 500 khó hiểu. Nay trả 503 kèm câu nhắc rõ ràng, và vòng lặp luyện dịch với bản gốc để tự đối chiếu vẫn hoạt động bình thường.

## v1.2 — Bịt lỗ hổng trải nghiệm

**Mở app có câu ngay cả khi mạng chậm.** Hàng đợi 20 câu gần nhất được lưu xuống máy. Mở app dựng lại hàng đợi cũ trước, rồi mới hỏi server ở nền. Mất mạng giữa chừng vẫn học tiếp được thay vì màn hình trắng.

**Đếm số lần mở app cho đúng.** Trước đây bấm qua Tiến độ rồi quay lại là cộng thêm một lần mở, con số bị thổi phồng. Nay mỗi phiên trình duyệt chỉ tính một lần.

**Thêm câu thủ công.** Trong Thư viện, mở một trang bài ra có nút thêm câu, không cần ảnh. Brief có yêu cầu nhưng v1.0 thiếu.

**Đổi độ khó của câu đã lưu.** Trước chỉ sửa được lúc duyệt ảnh, lưu rồi là kẹt.

**Đăng xuất.** Nằm ở góc trên trang Tiến độ. Xoá luôn hàng đợi và bản nháp trên máy.

**Đếm câu đã xong trong phiên.** Hiện ở thanh trạng thái, cho thấy công sức của lần mở app này.

## v1.1 — Sửa lỗi

Bốn lỗi dưới đây được phát hiện bằng `tests/probe.ts`, chạy mô phỏng đúng luồng của bản v1.0.

**Câu dịch sai bị mất khi kho gần cạn.** Đây là lỗi nặng nhất: nó phá đúng yêu cầu cốt lõi của app. Khi hàng đợi còn 1–2 câu, hàm nạp thêm ghi đè toàn bộ hàng đợi, cuốn theo cả câu đang chờ sửa. Người dùng dịch sai một câu rồi không bao giờ gặp lại nó.

```
Trước:  còn 2 câu, sai câu A → hàng đợi thành X,Y,Z   (A biến mất)
Sau:    còn 2 câu, sai câu A → hàng đợi thành B,A     (A quay lại)
```

Sửa bằng cách tách logic hàng đợi ra `src/lib/session.ts` dưới dạng hàm thuần, nạp thêm thì nối vào cuối chứ không ghi đè.

**Cờ "đúng ngay lần đầu" dùng chung cho mọi câu.** Dịch sai một câu là cờ tắt, và nó không bật lại khi sang câu hoàn toàn mới. Hệ quả: sau một lần sai, mọi câu sau đó trong phiên đều mất quyền nhân hệ số dù làm đúng ngay. Nay theo dõi riêng từng câu.

**Thưởng combo trễ một nhịp.** Brief ghi x1.2 khi đúng 3 câu liên tiếp, nhưng mã đếm số câu đúng *trước* câu đang chấm, nên phải tới câu thứ 4 mới được thưởng.

**Ngày tính theo UTC thay vì giờ Việt Nam.** Lưới streak và số liệu hôm nay dùng `toISOString()`. Từ 7 giờ tối trở đi ở Việt Nam, UTC vẫn đang ở ngày hôm trước, nên ô streak tô sai ngày và số liệu hôm nay hiển thị lệch. Nay dùng múi giờ lưu trong hồ sơ người dùng.

**Bỏ chặn phóng to.** `maximumScale: 1` khiến người dùng không zoom được, cản trở người mắt kém.

**Nhớ mức độ đang chọn.** Brief ghi "mặc định là chế độ dùng lần cuối" nhưng v1.0 không lưu gì cả.

**Sửa lỗi React trong trình sửa câu.** Truy vấn dữ liệu nằm thẳng trong thân hàm render, gây gọi lặp. Chuyển vào `useEffect`.

## v1.0 — Bản đầu

Toàn bộ vòng lặp theo brief: nạp ảnh bằng Claude vision, luyện dịch ngược, chấm bài chạy nền, điểm và streak, dashboard, PWA.

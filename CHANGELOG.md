# Nhật ký phiên bản

## v2.8 — Học theo đoạn

**Vấn đề.** App bốc ngẫu nhiên từ mọi đoạn đang bật, lọc theo một mức duy nhất. Cụm từ của đoạn A có thể đứng ngay trước một câu của đoạn B. Với người học theo từng đoạn thì chuyện lộn xộn này là tất nhiên.

**Mỗi lần nạp là một đoạn.** Cái trước đây gọi là "Trang bài" giờ gọi là "Đoạn", đúng với cách dùng thật. Không cần bảng mới: những đoạn đang luyện dùng lại cột `pages.is_default` có sẵn.

**Chọn đoạn ngay trên màn hình luyện.** Nút 📖 ở đầu màn hình ghi tên đoạn đang luyện. Bấm vào mở hộp chọn: mỗi đoạn có nút "Chỉ đoạn này" để vào luyện bằng một lần bấm, hoặc tick nhiều đoạn rồi bấm Luyện để trộn. Chọn tất cả thì thành học tự do, không cần một chế độ riêng.

**Chọn mức tự do, nhiều mức cùng lúc.** Ba nút Cụm từ, Câu, Đoạn bật tắt độc lập: chỉ Đoạn, chỉ Câu, Câu cộng Đoạn, hay cả ba. Không ép thứ tự cụm từ trước câu sau. Luôn còn ít nhất một mức được bật. App nhớ lựa chọn cho lần mở sau.

**Đổi lựa chọn là xoá sạch hàng đợi cũ.** Đổi đoạn hay đổi mức thì app bỏ hết câu của lựa chọn cũ, kể cả câu sai đang chờ quay lại. Câu sai đó không mất: nó vẫn nằm trong lịch ôn và quay lại khi bạn luyện lại đoạn đó. Lời gọi mạng nào đang dở của lựa chọn cũ cũng bị bỏ khi về tới, để không lẫn vào.

**Có đích đến.** Thanh tiến độ cạnh nút 📖 đếm số mục đã dịch đúng trên tổng số mục của lựa chọn. Xong hết thì con cáo chúc mừng, kèm nút "Sang đoạn tiếp" khi đang luyện một đoạn, "Chọn đoạn khác", và "Luyện lại từ đầu". Tiến độ được nhớ trong ngày, đóng app mở lại vẫn còn.

**Nạp vào đoạn có sẵn.** Bước duyệt có ô "Lưu vào": tạo đoạn mới, hoặc gắn vào một đoạn đã có. Tab Danh sách từ mặc định gắn vào đoạn mới nhất, vì thường đó là đoạn vừa học xong với Thầy.

**Luyện ngay sau khi nạp.** Ô "Luyện đoạn này ngay" tick sẵn: lưu xong là vào thẳng màn hình luyện với đúng đoạn vừa nạp.

**Route bốc câu nhận POST.** Danh sách câu cần bỏ qua có thể dài vài trăm mã khi luyện nhiều đoạn, nhét lên URL sẽ vượt giới hạn. Logic chọn câu chuyển thành hàm thuần `pickBatch` trong `src/lib/session.ts`, có test riêng.

**Tách màn hình luyện.** Các khối phụ chuyển sang `PracticeParts.tsx`, file chính chỉ còn phần điều khiển vòng lặp.

### Cần làm khi cập nhật

Chạy `MIGRATION-v2.8.sql` trong Supabase SQL Editor, dòng kiểm tra phải ra CÓ.

## v2.7 — Chịu được lúc Gemini quá tải

**Lỗi.** Khi một model Gemini báo quá tải (mã 503), app bỏ cuộc ngay thay vì thử model khác trong danh sách, rồi đổ nguyên khối JSON lỗi lên màn hình. Cơ chế thử nhiều model ở v2.0 chỉ tính trường hợp model không tồn tại, chưa tính trường hợp model tồn tại mà đang bận.

**Quá tải thì chuyển sang model khác.** Lỗi 500, 502, 503, 504 giờ được coi là lỗi tạm thời phía Google, nên app thử model kế tiếp. Model khác trong danh sách thường đang rảnh.

**Thông báo đọc được.** Mọi model đều quá tải thì báo một câu tiếng Việt ngắn thay vì JSON. Các lỗi khác cũng được rút lấy đúng câu thông báo bên trong.

**Nút Chấm lại** ngay trong khung báo lỗi, bấm là gửi chấm lần nữa mà không phải dịch lại câu.

Lỗi hết hạn mức (429) và khoá sai (401) vẫn dừng ngay như cũ, vì thử model khác cũng không giúp gì mà chỉ làm hạn mức cạn nhanh hơn.

## v2.6 — Sửa xung đột khi dùng chung project Supabase

**Lỗi.** Project Supabase này dùng chung cho nhiều app. Một app khác có hàm `fn_sync_user_email`, chạy mỗi khi ai đó đổi email, ghi vào bảng `profiles` hai cột `email` và `updated_at`. Bảng `profiles` là của Verso và không có hai cột đó. Hàm lỗi, và vì chạy như một trigger trên bảng tài khoản nên nó kéo theo cả thao tác đổi email bị huỷ — ở mọi app trong project, không riêng Verso.

Nguyên nhân gốc là `schema.sql` viết theo giả định Verso có database riêng, nên dùng những tên rất phổ biến mà không lường trước chuyện đụng hàng.

**Sửa.** Thêm hai cột `email` và `updated_at` vào `profiles`, điền email cho các hồ sơ đã có, và cho hàm tạo người dùng điền luôn email lúc đăng ký. Không xoá, không đổi tên gì, nên app nào đang dựa vào `profiles` vẫn chạy như cũ.

**Đã kiểm tra trên Postgres thật.** Dựng lại đúng tình trạng database hiện tại — danh sách cột khớp y hệt ảnh chụp — rồi xác nhận: trước khi sửa, đổi email báo lỗi `column "email" does not exist`; sau khi sửa thì chạy được; chạy file sửa lần hai không lỗi; tài khoản mới tự có email; và `schema.sql` mới dựng được từ đầu ở cả project trống lẫn project đã có app khác.

**`schema.sql` có cảnh báo ở đầu file** về chuyện dùng chung project, và README có mục riêng giải thích.

**File `TEST-doi-email.sql`** để tự kiểm tra sau khi sửa. Nó tạm đổi email một tài khoản, xem hàm đồng bộ có chạy không, rồi huỷ toàn bộ. Đã thử cả khi lỗi giữa chừng: email thật vẫn nguyên.

### Cần làm khi cập nhật

Chạy `MIGRATION-v2.6.sql` trong Supabase SQL Editor. Ba dòng kiểm tra ở cuối phải ra CÓ. Rồi chạy `TEST-doi-email.sql`, thấy dòng ĐÃ CHẠY ĐƯỢC là xong.

## v2.5 — Chuyển tab nhanh hơn

Chuyển giữa các tab mất 2-3 giây. Nguyên nhân chính không nằm ở code mà ở nơi đặt server.

**Server đặt sai chỗ.** Vercel mặc định chạy mọi project mới ở Washington, Mỹ. Supabase thì đặt ở Singapore cho gần Việt Nam. Nên mỗi lần hỏi database, dữ liệu đi Việt Nam → Mỹ → Singapore → Mỹ → Việt Nam. Một chặng Mỹ ↔ Singapore đã mất khoảng 200 mili giây, mà mỗi trang hỏi ba bốn lần liên tiếp.

Thêm file `vercel.json` đặt vùng chạy về Singapore, cùng chỗ với Supabase. Gói miễn phí của Vercel cho chọn một vùng tuỳ ý.

**Kiểm tra đăng nhập hai lần mỗi lời gọi API.** Middleware chạy cả trên đường `/api`, trong khi mỗi route API vốn đã tự kiểm tra đăng nhập và tự làm mới phiên. Mỗi lần chấm bài, bốc câu, đo thời gian đều tốn thêm một chuyến ra Supabase vô ích. Bỏ `/api` khỏi phạm vi middleware.

**Hỏi lần lượt những thứ hỏi cùng lúc được.** Route bốc câu hỏi danh sách trang bài trước, đợi xong mới hỏi câu tới hạn, đợi xong mới hỏi thêm câu. Nay nối thẳng bảng câu sang bảng trang bài trong một câu hỏi, và chạy ba câu hỏi còn lại song song. Từ năm chuyến nối tiếp xuống còn hai. Trang chính và trang Tiến độ cũng gom các câu hỏi độc lập lại chạy cùng lúc.

**Quay lại tab vừa xem thì hiện ngay.** Trình duyệt giữ trang vừa xem trong 30 giây, bấm qua lại không phải đợi server dựng lại. Riêng khi vừa chấm câu xong mà mở Tiến độ, app tự làm mới để không hiện số liệu cũ.

| Thao tác | Số chuyến trước | Số chuyến sau |
| --- | --- | --- |
| Mở màn hình luyện | 4 | 3 |
| Bốc câu để dịch | 5 | 2 |
| Mở Tiến độ | 4 | 3 |
| Mỗi lời gọi API | thêm 1 | không thêm |

Mỗi chuyến giảm từ khoảng 200 mili giây xuống vài mili giây khi server và database cùng vùng.

### Cần kiểm tra khi cập nhật

File `vercel.json` đặt vùng Singapore, dựa trên giả định Supabase của bạn cũng ở Singapore. Vào Supabase, Project Settings, mục General, xem dòng Region. Nếu không phải Singapore thì đổi `sin1` trong `vercel.json` sang vùng khớp — đặt lệch vùng còn chậm hơn cả lúc chưa sửa.

## v2.4 — Rà soát toàn diện

Bản này không thêm tính năng lớn mà đi sửa những chỗ v2.3 còn thiếu hoặc làm sai, tìm ra bằng cách rà lại toàn bộ mã nguồn.

### Lỗi đã sửa

**Chữ quá nhạt, không đọc nổi.** Đo lại theo chuẩn WCAG AA thì bảy chỗ trong bảng màu sáng không đạt. Nặng nhất là chữ trắng trên nút cam, chỉ đạt 2.65 trên mức 4.5 cần có — mà đó lại là nút chính của app.

Cách sửa giữ nguyên màu cam sáng vì đó là nhận diện của app: đổi chữ trên nút từ trắng sang nâu đen, đạt 5.81. Chữ phụ, cam làm chữ, đỏ báo lỗi và tím đều đậm lên. Bảng tối vốn đã đạt nên giữ nguyên. Có một bộ test riêng tính lại tỉ lệ tương phản cho cả 18 cặp màu, nên lần sau đổi màu mà làm hỏng là biết ngay.

**Múi giờ luôn mặc định Việt Nam.** Cột `timezone` trong hồ sơ có từ đầu nhưng chưa bao giờ được ghi giá trị thật, nên ai ở múi giờ khác sẽ thấy streak và lịch lệch một ngày. Nay app đọc múi giờ từ máy và ghi vào hồ sơ, chỉ ghi khi khác giá trị đang lưu.

**Không có đường lấy lại mật khẩu.** Lỗ hổng phát sinh từ lúc bỏ magic link ở v1.9: quên mật khẩu là mất tài khoản. Nay có trang đặt lại đầy đủ, vào từ liên kết ngay dưới nút đăng nhập.

**Kiểm trùng khi nạp kéo cả thư viện về.** Mỗi lần nạp tài liệu, server tải toàn bộ câu của người dùng chỉ để so trùng. Thư viện càng lớn càng chậm. Nay chỉ hỏi đúng những câu sắp nạp.

### Bổ sung

**Mục tiêu mỗi ngày.** Đây là phần trả thưởng còn nợ từ brief đầu tiên. Vòng tròn tiến độ nằm ở thanh trên màn hình luyện, đầy dần theo số câu đã xong trong ngày. Đạt mục tiêu thì con cáo hiện ra chúc mừng, đúng một lần, không lặp lại ở những câu sau. Chọn mức 5, 10, 20 hay 30 câu trong trang Tiến độ.

**Ôn lại câu hay sai.** Bảng `cards` vẫn ghi số lần gặp và số lần đúng của từng câu, nhưng trước nay chưa dùng vào việc gì. Trang Tiến độ giờ có mục gom tám câu sai nhiều nhất, chạm vào để xem bản gốc.

**Chạy được offline thật.** Trước đây hàng đợi câu đã lưu trên máy, nhưng mất mạng thì trang còn không mở nổi. Thêm một service worker nhỏ lo phần khung app; dữ liệu và xác thực vẫn luôn lấy mới, không bao giờ trả bản cũ.

**Lỗi không còn làm trắng màn hình.** Thêm trang chặn lỗi có nút thử lại, trang báo không tìm thấy, và vòng quay chờ khi chuyển trang.

**Sửa câu lỗi ngay khi đang luyện.** Dưới đề bài có dòng "Câu này có vấn đề?", mở ra sửa cả hai vế hoặc xoá hẳn câu, không phải bỏ dở đi vòng qua Thư viện. Hay dùng với câu tách từ ảnh bị đọc sai chữ.

**Tìm kiếm trong thư viện,** hiện khi có từ năm trang bài trở lên.

### Cần làm khi cập nhật

Database có thêm một cột. Vào Supabase, mở SQL Editor và chạy:

```sql
alter table profiles
  add column if not exists daily_goal int not null default 10
  check (daily_goal between 1 and 200);
```

Không chạy thì trang Tiến độ và vòng mục tiêu sẽ lỗi.

## v2.3 — Danh sách nạp được cả câu

**Thanh chọn mức ngay trong tab Danh sách:** Cụm từ, Câu, Đoạn, Tự đoán. Trước đây mọi dòng đều vào mức Cụm từ, nên muốn nạp một danh sách câu thì phải sửa tay từng dòng ở bước duyệt.

**Tự đoán từng dòng.** Hợp khi danh sách lẫn cả cụm từ lẫn câu. Cách đoán dựa vào vế tiếng Anh: từ sáu chữ trở lên, hoặc kết thúc bằng dấu chấm, thì tính là câu; nhiều câu liền nhau thì tính là đoạn; ngắn và không có dấu kết câu thì là cụm từ. Vế tiếng Việt dài bất thường cũng được coi là dấu hiệu của câu, để bắt những trường hợp nghĩa được diễn giải dài.

**Vẫn sửa được từng dòng** ở bước duyệt như cũ, nên đoán sai cũng không sao.

**Tên trang bài phản ánh mức đã chọn**, ví dụ "Danh sách 24 câu" thay vì luôn là "từ".

## v2.2 — Nạp bằng danh sách từ vựng

**Chế độ thứ ba khi nạp liệu.** Ba tab: Danh sách từ, Đoạn văn, Từ ảnh. Tab đầu nhận một danh sách từ vựng dán vào, mỗi dòng một từ hoặc cụm kèm nghĩa.

**Tách ngay trên máy, không gọi model.** Danh sách vốn đã có cấu trúc nên không cần model đoán. Kết quả hiện tức thì, không tốn hạn mức, và không hỏng khi mất mạng.

**Nhận nhiều kiểu trình bày.** Dấu ngăn có thể là gạch ngang, gạch dài, hai chấm, dấu bằng, gạch đứng hay dấu tab — nên dán thẳng từ bảng Excel hay Google Sheets cũng chạy.

**Tự đoán vế nào là tiếng Anh** bằng dấu thanh tiếng Việt, nên dán theo chiều nào cũng được.

**Không cắt nhầm những chỗ hay hỏng.** Gạch nối trong `well-being` hay `state-of-the-art` được giữ nguyên, vì dấu gạch chỉ tính là dấu ngăn khi có khoảng trắng bao quanh. Dòng tiêu đề kiểu "Chương 3: từ vựng" bị bỏ qua, vì cả hai vế đều là tiếng Việt nên không thể là cặp Anh - Việt.

**Dọn rác đầu dòng và cuối dòng:** số thứ tự, dấu chấm đầu dòng, ngoặc kép bao quanh, dấu câu thừa. Cặp trùng nhau chỉ giữ bản đầu tiên.

**Báo rõ dòng nào bị bỏ.** Bước duyệt liệt kê những dòng không tách được để người dùng tự sửa, thay vì im lặng nuốt mất.

## v2.1 — Dùng đúng model Google khuyến nghị

Google trả về thông báo rất cụ thể: `gemini-2.5-flash` không còn mở cho tài khoản mới, và khuyên dùng `gemini-3.6-flash`. Tên tôi đoán ở v2.0 chưa khớp với thứ tài khoản này được cấp.

**Đặt `gemini-3.6-flash` lên đầu danh sách**, giữ các tên khác phía sau làm lưới an toàn.

**Nhớ model nào vừa chạy được.** Lần gọi sau trong cùng một tiến trình đi thẳng tới model đó, khỏi thử lại những cái đã chết. Đỡ một hai giây mỗi lần và đỡ tốn lượt gọi. Model đang nhớ mà hỏng thì tự quên đi và dò lại từ đầu.

## v2.0 — Chọn ảnh từ thư viện, và Gemini bền hơn

**Chọn ảnh từ thư viện.** Trước đây ô chọn ảnh có thuộc tính `capture`, khiến điện thoại mở thẳng camera và không cho lấy ảnh có sẵn. Bỏ thuộc tính đó đi, giờ bấm vào là hệ điều hành cho chọn giữa chụp mới và lấy từ thư viện.

**Đổi model Gemini mặc định.** Dòng 2.5 sẽ ngừng hoạt động từ tháng 10/2026, tức là app sẽ tự chết sau vài tuần nữa nếu để nguyên. Mặc định chuyển sang dòng 3.

**Thử nhiều model thay vì một.** Mỗi việc giờ có một danh sách model xếp theo thứ tự ưu tiên. Model đầu không tồn tại hay không có quyền thì tự thử cái kế tiếp, dừng lại ở cái đầu tiên chạy được. Google đổi tên và khai tử model khá thường xuyên, để một mình một model là app chết theo.

**Phân biệt lỗi nên thử tiếp và lỗi phải dừng.** Model không tồn tại thì thử model khác. Nhưng vượt hạn mức hay khoá sai thì dừng ngay, vì thử thêm chỉ tốn thời gian và làm hạn mức cạn nhanh hơn.

**Thông báo lỗi nói rõ phải làm gì.** Khoá sai thì chỉ đường tạo khoá mới. Vượt hạn mức thì bảo đợi. Nội dung quá dài thì bảo thử đoạn ngắn hơn. Hết model thì liệt kê đã thử những gì.

**Lỗi chấm bài hiện lên màn hình.** Trước đây chỉ hiện một câu chung chung, không biết vì sao. Nay hiện đúng nguyên nhân, kèm dòng nhắc rằng bản gốc vẫn đủ để tự đối chiếu nên việc học không bị chặn.

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

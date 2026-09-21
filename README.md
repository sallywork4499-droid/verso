# Verso

Luyện dịch ngược Việt → Anh trên chính tài liệu bạn đang học. Mở app là vào thẳng một câu cần dịch — không menu, không màn hình chờ.

## Chạy lần đầu

### 1. Supabase

Tạo project mới tại [supabase.com](https://supabase.com), rồi mở **SQL Editor** và chạy toàn bộ nội dung `supabase/schema.sql`. File này tạo 6 bảng, bật Row Level Security, tạo hàm `log_activity` và bucket `docs` để chứa ảnh.

Vào **Authentication → Providers**, bật **Email**. Trong **Email Templates**, để mặc định là được (đăng nhập bằng magic link, không cần mật khẩu).

Vào **Authentication → URL Configuration**, thêm domain Vercel của bạn vào *Redirect URLs*, dạng `https://ten-app.vercel.app/auth/callback`. Lúc chạy máy local thì thêm `http://localhost:3000/auth/callback`.

### 2. Biến môi trường

```bash
cp .env.example .env.local
```

Hai khoá Supabase là bắt buộc:

| Biến | Lấy ở đâu |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cùng trang, mục `anon public` |

Ngoài ra cần ít nhất một khoá model. Hai lựa chọn:

**Gemini** — có bậc miễn phí vĩnh viễn, không cần thẻ tín dụng. Lấy khoá ở [aistudio.google.com/apikey](https://aistudio.google.com/apikey), đặt vào `GEMINI_API_KEY`. Hạn mức miễn phí giới hạn ở dòng Flash và Flash-Lite, cỡ vài trăm đến một nghìn lượt mỗi ngày tuỳ model — thừa cho một người học. Đổi lại, dữ liệu ở bậc miễn phí có thể được Google dùng để huấn luyện mô hình.

**Claude** — trả theo lượng dùng, không có bậc miễn phí. Lấy khoá ở [console.anthropic.com](https://console.anthropic.com), đặt vào `ANTHROPIC_API_KEY`. Lưu ý: đây là tài khoản riêng, gói Claude trả hàng tháng để chat **không dùng được** cho API.

Đặt cả hai khoá cũng được. Mặc định app ưu tiên Gemini.

Khoá model chỉ nằm ở server, không bao giờ gửi xuống trình duyệt.

### 2b. Chọn nhà cung cấp cho từng việc

App cần model làm hai việc tách biệt: **đọc ảnh** (`ingest`) và **chấm bài** (`grade`). Mỗi việc chỉ định riêng được:

```bash
AI_PROVIDER=gemini             # áp cho cả hai việc
AI_PROVIDER_INGEST=anthropic   # riêng đọc ảnh dùng Claude
AI_PROVIDER_GRADE=gemini       # riêng chấm bài dùng Gemini
```

Đổi model mà không đụng code:

```bash
GEMINI_MODEL_INGEST=gemini-2.5-flash
GEMINI_MODEL_GRADE=gemini-2.5-flash-lite
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Mặc định khâu đọc ảnh dùng model khoẻ hơn một bậc, vì đọc chữ tiếng Việt có dấu từ ảnh khó hơn chấm một câu dịch.

Không cấu hình khoá model nào thì app vẫn chạy đủ vòng lặp luyện dịch với bản gốc để tự đối chiếu, chỉ mất phần đọc ảnh và nhận xét chi tiết.

### 3. Chạy

```bash
npm install
npm run dev
```

### 4. Deploy

Push lên GitHub, import repo vào Vercel, dán cả ba biến môi trường vào **Environment Variables**. Vercel tự nhận Next.js, không cần cấu hình gì thêm.

Sau khi có domain, quay lại Supabase thêm `https://<domain>/auth/callback` vào Redirect URLs.

### 5. Cài lên điện thoại

Mở domain bằng Safari (iOS) hoặc Chrome (Android) → Chia sẻ → Thêm vào màn hình chính. Mở từ icon sẽ không còn thanh địa chỉ.

## Dùng chung project Supabase với app khác

Gói miễn phí của Supabase giới hạn số project, nên nhiều người đặt nhiều app vào chung một project. Làm vậy được, nhưng cần biết ba điều.

**Các app dùng chung danh sách tài khoản.** Cùng một email và mật khẩu đăng nhập được mọi app trong project. Ai tạo tài khoản ở app nào cũng tự có một dòng hồ sơ trong bảng `profiles` của Verso.

**Tên dễ đụng nhau.** `schema.sql` dùng những tên rất phổ biến: bảng `profiles`, hàm `handle_new_user`, trigger `on_auth_user_created`. Nếu app khác đã dùng các tên đó, chạy `schema.sql` sẽ ghi đè mà không báo gì.

**Project đã có Verso thì đừng chạy lại `schema.sql`.** Chỉ chạy các file `MIGRATION-v*.sql` theo đúng thứ tự phiên bản. Mọi file migration đều chỉ thêm chứ không xoá, và chạy lại nhiều lần vẫn an toàn.

Bảng `profiles` có sẵn hai cột `email` và `updated_at` cho những app khác hay đồng bộ email vào đây.

## Cách dùng

1. **Nạp tài liệu** — Thư viện → Nạp tài liệu. Chụp bản tiếng Anh gốc và bản dịch tiếng Việt của cùng nội dung. Claude đọc chữ, tách câu, ghép cặp và gắn độ khó. Bạn duyệt lại rồi lưu.
2. **Luyện** — mở app là có câu tiếng Việt. Gõ bản tiếng Anh, nhấn Kiểm tra. Bản gốc hiện ra ngay để tự đối chiếu; nhận xét chi tiết của Claude trượt vào sau vài giây, không phải chờ.
3. **Tự phán** — Đúng rồi hoặc Chưa đúng. Câu bị đánh sai quay lại sau vài câu khác, lặp cho đến khi dịch đúng.

Trong Thư viện, tick để bật/tắt từng trang bài. App chỉ bốc câu từ những trang đang bật.

## Điểm

| Đơn vị | Điểm cơ bản | Thưởng thêm |
| --- | --- | --- |
| Cụm từ | 10 | — |
| Câu | 30 | x1.2 khi đang trong chuỗi 3 câu đúng liên tiếp |
| Đoạn | 100 | x1.5 khi đúng ngay lần đầu |

Dịch sai không bị trừ điểm. Câu phải sửa nhiều lần mới đúng vẫn được điểm cơ bản, không nhân hệ số.

Câu đã đúng giãn dần khoảng cách gặp lại: 1 ngày → 3 → 7 → 21.

## Cấu trúc

```
src/
  app/
    page.tsx              màn hình luyện (mặc định khi mở app)
    login/                đăng nhập bằng magic link
    library/              danh sách trang bài, sửa/xoá câu
    library/new/          nạp ảnh và duyệt kết quả
    dashboard/            streak, số lần mở app, thời gian, ví điểm
    api/
      ingest/             2 ảnh → Claude vision → cặp câu
      grade/              chấm bài, chạy nền
      next-card/          bốc lô câu theo độ khó và kho mặc định
      attempt/            ghi kết quả, tính điểm, cập nhật streak
      heartbeat/          đo thời gian và số lần mở app
  components/             Practice, Ingest, PageList, StreakGrid
  lib/
    scoring.ts            điểm, khoảng cách ôn lại, huy hiệu
    supabase/             client, server, middleware
supabase/schema.sql       toàn bộ database
```

## Chi phí

Với Gemini bậc miễn phí và một người dùng, chi phí bằng không. Cần để ý hạn mức lượt/phút và lượt/ngày mà AI Studio hiển thị cho project của bạn — con số chính thức nằm ở đó, không phải ở các bài blog.

Với Claude, mỗi lần chấm một câu tốn khoảng vài trăm đồng, mỗi lần nạp một trang bài từ hai ảnh khoảng một nghìn đồng. Giá hiện hành xem ở trang pricing của Anthropic.

Muốn tiết kiệm mà vẫn dùng Claude: đổi `ANTHROPIC_MODEL` sang dòng Haiku cho khâu chấm bài.

## Chưa làm

Đổi điểm lấy vật phẩm sưu tập (gacha). Điểm hiện chỉ tích luỹ và mở huy hiệu theo mốc.

## Chạy test

```bash
npm test
```

Kiểm tra logic hàng đợi, tính điểm, giãn cách ôn lại, huy hiệu và múi giờ. Không cần Supabase hay mạng.

`tests/probe.ts` là kịch bản dò lỗi dùng để tìm ra các lỗi đã sửa ở v1.1, giữ lại để đối chiếu.

-- ============================================================
-- Thử xem đổi email đã hết lỗi chưa. KHÔNG ĐỔI GÌ THẬT.
--
-- Đoạn này tạm đổi email của một tài khoản, xem hàm đồng bộ có chạy không,
-- rồi huỷ toàn bộ bằng rollback. Dù chạy thành công hay lỗi giữa chừng,
-- email thật vẫn giữ nguyên.
-- ============================================================
begin;

update auth.users
set email = 'thu-nghiem-verso@example.invalid'
where id = (select id from public.profiles order by created_at limit 1);

-- Thấy dòng này với email thử nghiệm là hàm đồng bộ đã chạy đúng
select 'ĐÃ CHẠY ĐƯỢC' as ket_qua, email, updated_at
from public.profiles
where id = (select id from public.profiles order by created_at limit 1);

rollback;

-- ============================================================
-- Verso v2.6 — sửa xung đột khi dùng chung project Supabase
--
-- Tình hình: một app khác trong cùng project có hàm fn_sync_user_email,
-- chạy mỗi khi ai đó đổi email, và ghi vào public.profiles hai cột
-- email và updated_at. Bảng profiles là của Verso và không có hai cột đó,
-- nên hàm lỗi và mọi thao tác đổi email trong project đều bị huỷ.
--
-- File này chỉ THÊM, không xoá hay đổi tên gì. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================

-- 1. Thêm hai cột mà hàm đồng bộ email của app kia cần
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- 2. Điền email cho những hồ sơ đã có, lấy từ danh sách tài khoản
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

-- 3. Hàm tạo người dùng điền luôn email lúc đăng ký,
--    để cột email không bị trống với tài khoản mới
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- 4. Kiểm tra: cả ba dòng phải ra CÓ
select 'cột email'      as kiem_tra, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email')      then 'CÓ' else 'THIẾU' end as ket_qua
union all
select 'cột updated_at',             case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at') then 'CÓ' else 'THIẾU' end
union all
select 'hàm đăng ký ghi email',      case when pg_get_functiondef('public.handle_new_user'::regproc) ilike '%new.email%' then 'CÓ' else 'THIẾU' end;

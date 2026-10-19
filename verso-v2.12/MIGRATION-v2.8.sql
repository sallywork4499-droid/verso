-- ============================================================
-- Verso v2.8 — học theo đoạn
--
-- Mỗi lần nạp là một đoạn. Những đoạn đang được tick ở màn hình luyện
-- dùng lại cột pages.is_default có sẵn, nên không cần bảng mới.
-- File này chỉ thêm một cột để nhớ bạn đang luyện những mức nào.
--
-- Chỉ THÊM, không xoá hay đổi tên gì. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================

alter table public.profiles
  add column if not exists focus_levels text[] not null
  default array['phrase', 'sentence', 'paragraph'];

-- Kiểm tra: phải ra CÓ
select 'cột focus_levels' as kiem_tra,
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = 'focus_levels'
       ) then 'CÓ' else 'THIẾU' end as ket_qua;

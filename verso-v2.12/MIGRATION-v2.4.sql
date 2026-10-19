-- ============================================================
-- Verso v2.4 — cập nhật database
-- Chạy trong Supabase SQL Editor nếu database đã dựng từ bản trước.
-- Dựng mới từ schema.sql thì không cần chạy file này.
-- ============================================================

alter table profiles
  add column if not exists daily_goal int not null default 10
  check (daily_goal between 1 and 200);

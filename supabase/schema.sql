-- ============================================================
-- Verso - Schema Supabase
-- Chạy toàn bộ file này trong SQL Editor của Supabase project.
--
-- CẢNH BÁO KHI DÙNG CHUNG PROJECT VỚI APP KHÁC
-- File này dùng những tên rất phổ biến: bảng profiles, hàm handle_new_user,
-- trigger on_auth_user_created. Nếu project đã có app khác dùng các tên đó,
-- chạy file này sẽ GHI ĐÈ hàm và trigger của app kia mà không báo gì.
--
-- Project đã có sẵn Verso: đừng chạy lại file này.
-- Chỉ chạy các file MIGRATION-v*.sql theo đúng thứ tự phiên bản.
-- ============================================================

-- 1. HỒ SƠ NGƯỜI DÙNG -----------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  total_points bigint not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  preferred_difficulty text not null default 'sentence'
    check (preferred_difficulty in ('phrase','sentence','paragraph')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  daily_goal int not null default 10 check (daily_goal between 1 and 200),
  -- Hai cột dưới dành cho các app khác trong cùng project hay đồng bộ email vào đây
  email text,
  updated_at timestamptz default now(),
  created_at timestamptz not null default now()
);

-- Tự tạo hồ sơ khi có user mới đăng ký
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. TRANG BÀI -------------------------------------------------
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  image_en_url text,
  image_vi_url text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. CẶP CÂU VIỆT - ANH ----------------------------------------
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  vi_text text not null,
  en_text text not null,
  difficulty text not null check (difficulty in ('phrase','sentence','paragraph')),
  times_seen int not null default 0,
  times_correct int not null default 0,
  streak int not null default 0,
  next_due_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 4. LỊCH SỬ TỪNG LẦN TRẢ LỜI ----------------------------------
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  user_answer text not null,
  is_correct boolean not null,
  first_try boolean not null default true,
  points_earned int not null default 0,
  llm_feedback jsonb,
  created_at timestamptz not null default now()
);

-- 5. NHẬT KÝ THEO NGÀY -----------------------------------------
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  seconds_spent int not null default 0,
  cards_completed int not null default 0,
  app_opens int not null default 0,
  points_earned int not null default 0,
  unique (user_id, log_date)
);

-- 6. HUY HIỆU --------------------------------------------------
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- INDEX --------------------------------------------------------
create index if not exists cards_due_idx on cards (user_id, difficulty, next_due_at);
create index if not exists cards_page_idx on cards (page_id);
create index if not exists attempts_card_idx on attempts (card_id);
create index if not exists daily_logs_idx on daily_logs (user_id, log_date desc);
create index if not exists pages_user_idx on pages (user_id, created_at desc);

-- ROW LEVEL SECURITY -------------------------------------------
alter table profiles    enable row level security;
alter table pages       enable row level security;
alter table cards       enable row level security;
alter table attempts    enable row level security;
alter table daily_logs  enable row level security;
alter table badges      enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own pages" on pages;
create policy "own pages" on pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own cards" on cards;
create policy "own cards" on cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attempts" on attempts;
create policy "own attempts" on attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own logs" on daily_logs;
create policy "own logs" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own badges" on badges;
create policy "own badges" on badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- HÀM GHI HOẠT ĐỘNG + TÍNH STREAK
-- Gọi từ API route. Gộp 1 lần ghi để tránh race condition.
-- ============================================================
create or replace function log_activity(
  p_seconds int default 0,
  p_cards int default 0,
  p_opens int default 0,
  p_points int default 0
)
returns profiles
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_last date;
  v_streak int;
  v_row profiles;
begin
  if v_uid is null then
    raise exception 'chưa đăng nhập';
  end if;

  select timezone, last_active_date, current_streak
    into v_tz, v_last, v_streak
    from profiles where id = v_uid;

  v_today := (now() at time zone coalesce(v_tz, 'Asia/Ho_Chi_Minh'))::date;

  insert into daily_logs (user_id, log_date, seconds_spent, cards_completed, app_opens, points_earned)
  values (v_uid, v_today, p_seconds, p_cards, p_opens, p_points)
  on conflict (user_id, log_date) do update set
    seconds_spent   = daily_logs.seconds_spent   + excluded.seconds_spent,
    cards_completed = daily_logs.cards_completed + excluded.cards_completed,
    app_opens       = daily_logs.app_opens       + excluded.app_opens,
    points_earned   = daily_logs.points_earned   + excluded.points_earned;

  -- Streak chỉ nhích khi thực sự hoàn thành câu, không phải chỉ mở app
  if p_cards > 0 then
    if v_last is null then
      v_streak := 1;
    elsif v_last = v_today then
      v_streak := greatest(v_streak, 1);
    elsif v_last = v_today - 1 then
      v_streak := v_streak + 1;
    else
      v_streak := 1;
    end if;

    update profiles set
      total_points = total_points + p_points,
      current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak),
      last_active_date = v_today
    where id = v_uid
    returning * into v_row;
  else
    update profiles set total_points = total_points + p_points
    where id = v_uid
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- STORAGE: bucket chứa ảnh tài liệu người dùng tải lên
-- ============================================================
insert into storage.buckets (id, name, public)
values ('docs', 'docs', false)
on conflict (id) do nothing;

drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects
  for select using (bucket_id = 'docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own files write" on storage.objects;
create policy "own files write" on storage.objects
  for insert with check (bucket_id = 'docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects
  for delete using (bucket_id = 'docs' and auth.uid()::text = (storage.foldername(name))[1]);

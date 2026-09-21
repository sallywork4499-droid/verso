import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Calendar from '@/components/Calendar';
import SignOut from '@/components/SignOut';
import ThemePicker from '@/components/ThemePicker';
import GoalPicker from '@/components/GoalPicker';
import WeakCards from '@/components/WeakCards';
import type { Card } from '@/lib/types';
import { badgeLabel, POINT_BADGES, STREAK_BADGES } from '@/lib/scoring';
import { dateKey } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: logs }, { data: badges }, { data: weak }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase
      .from('daily_logs')
      .select('log_date,seconds_spent,cards_completed,app_opens')
      .eq('user_id', user!.id)
      .order('log_date', { ascending: false })
      .limit(400),
    supabase.from('badges').select('badge_key').eq('user_id', user!.id),
    // Câu hay sai nhất: đã gặp vài lần mà tỉ lệ đúng còn thấp
    supabase
      .from('cards')
      .select('id,page_id,vi_text,en_text,difficulty,times_seen,times_correct,streak,next_due_at')
      .eq('user_id', user!.id)
      .gte('times_seen', 2)
      .order('times_correct', { ascending: true })
      .limit(40),
  ]);

  const weakCards = ((weak ?? []) as Card[])
    .filter((c) => c.times_seen - c.times_correct >= 2)
    .sort(
      (a, b) =>
        b.times_seen - b.times_correct - (a.times_seen - a.times_correct) ||
        a.times_correct / a.times_seen - b.times_correct / b.times_seen
    )
    .slice(0, 8);

  const tz = profile?.timezone ?? 'Asia/Ho_Chi_Minh';
  const today = dateKey(new Date(), tz);
  const todayLog = logs?.find((l) => l.log_date === today);
  const week = (logs ?? []).slice(0, 7);
  const weekMinutes = Math.round(week.reduce((s, l) => s + l.seconds_spent, 0) / 60);
  const totalCards = (logs ?? []).reduce((s, l) => s + l.cards_completed, 0);

  const earned = Array.from(new Set((badges ?? []).map((b) => b.badge_key)));
  const points = profile?.total_points ?? 0;
  const nextPointBadge = POINT_BADGES.find((m) => points < m);
  const nextStreakBadge = STREAK_BADGES.find((m) => (profile?.current_streak ?? 0) < m);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 pb-16 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Luyện dịch
        </Link>
        <SignOut />
      </div>

      <h1 className="mt-6 font-study text-3xl text-ink">Tiến độ</h1>

      <section className="mt-8">
        <p className="text-5xl font-bold text-brand">
          {profile?.current_streak ?? 0}
          <span className="ml-2 text-base text-muted">ngày liên tục</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Dài nhất từ trước tới giờ: {profile?.longest_streak ?? 0} ngày
        </p>
        <div className="mt-5">
          <Calendar logs={logs ?? []} timezone={tz} />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3">
        <Stat value={todayLog?.app_opens ?? 0} label="lần mở app hôm nay" />
        <Stat
          value={`${todayLog?.cards_completed ?? 0}/${profile?.daily_goal ?? 10}`}
          label="câu hôm nay so với mục tiêu"
        />
        <Stat value={`${Math.round((todayLog?.seconds_spent ?? 0) / 60)} phút`} label="hôm nay" />
        <Stat value={`${weekMinutes} phút`} label="bảy ngày gần nhất" />
      </section>

      <section className="mt-10">
        <p className="text-3xl text-ink">{points.toLocaleString('vi-VN')}</p>
        <p className="mt-1 text-sm text-muted">
          điểm tích luỹ · {totalCards.toLocaleString('vi-VN')} câu đã hoàn thành
        </p>
        {nextPointBadge && (
          <p className="mt-3 text-sm text-muted">
            Còn {(nextPointBadge - points).toLocaleString('vi-VN')} điểm tới mốc{' '}
            {nextPointBadge.toLocaleString('vi-VN')}.
            {nextStreakBadge &&
              ` Còn ${nextStreakBadge - (profile?.current_streak ?? 0)} ngày tới mốc ${nextStreakBadge} ngày.`}
          </p>
        )}
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm text-muted">Hay sai nhất</p>
        <WeakCards cards={weakCards} />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm text-muted">Mục tiêu mỗi ngày</p>
        <GoalPicker userId={user!.id} goal={profile?.daily_goal ?? 10} />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm text-muted">Giao diện</p>
        <ThemePicker />
      </section>

      {earned.length > 0 && (
        <section className="mt-10">
          <p className="text-sm text-muted">Đã đạt</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {earned.map((key) => (
              <li
                key={key}
                className="rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brandDeep"
              >
                {badgeLabel(key)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <p className="text-2xl text-ink">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{label}</p>
    </div>
  );
}

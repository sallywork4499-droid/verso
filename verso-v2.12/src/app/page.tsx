import { redirect } from 'next/navigation';
import Practice from '@/components/Practice';
import TimezoneSync from '@/components/TimezoneSync';
import { createClient } from '@/lib/supabase/server';
import { dateKey } from '@/lib/session';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Hỏi song song: hồ sơ, nhật ký hôm nay và danh sách đoạn không phụ thuộc nhau
  const [{ data: found }, { data: logs }, { data: pageRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('daily_logs')
      .select('log_date,cards_completed')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(2),
    supabase
      .from('pages')
      .select('id,title,is_default,created_at,cards(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  const pages = (pageRows ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    is_default: p.is_default as boolean,
    created_at: p.created_at as string,
    card_count: (p.cards as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  let profile = found;
  if (!profile) {
    const { data } = await supabase.from('profiles').insert({ id: user.id }).select().single();
    profile = data;
  }
  const p = profile as Profile;

  // Lấy hai ngày gần nhất rồi chọn đúng hôm nay theo múi giờ người dùng,
  // khỏi phải đợi có hồ sơ mới biết hỏi ngày nào
  const today = dateKey(new Date(), p.timezone);
  const todayLog = (logs ?? []).find((l) => l.log_date === today);

  return (
    <>
      <TimezoneSync userId={p.id} current={p.timezone} />
      <Practice profile={p} doneToday={todayLog?.cards_completed ?? 0} pages={pages} />
    </>
  );
}

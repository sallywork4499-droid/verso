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

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const { data } = await supabase
      .from('profiles')
      .insert({ id: user.id })
      .select()
      .single();
    profile = data;
  }

  const p = profile as Profile;

  const { data: todayLog } = await supabase
    .from('daily_logs')
    .select('cards_completed')
    .eq('user_id', user.id)
    .eq('log_date', dateKey(new Date(), p.timezone))
    .maybeSingle();

  return (
    <>
      <TimezoneSync userId={p.id} current={p.timezone} />
      <Practice profile={p} doneToday={todayLog?.cards_completed ?? 0} />
    </>
  );
}

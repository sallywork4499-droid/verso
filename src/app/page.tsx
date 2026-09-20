import { redirect } from 'next/navigation';
import Practice from '@/components/Practice';
import { createClient } from '@/lib/supabase/server';
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

  return <Practice profile={profile as Profile} />;
}

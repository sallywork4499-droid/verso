import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PageList from '@/components/PageList';
import type { Page } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Library() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pages } = await supabase
    .from('pages')
    .select('id,title,is_default,created_at,cards(count)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const list: Page[] = (pages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    is_default: p.is_default,
    created_at: p.created_at,
    card_count: (p.cards as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 pb-16 pt-4">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Luyện dịch
        </Link>
        <Link href="/library/new" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-onBrand shadow-brand">
          Nạp tài liệu
        </Link>
      </header>

      <h1 className="font-study text-3xl text-ink">Thư viện</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Tick là đang luyện. Chọn nhanh hơn ở nút 📖 trên màn hình luyện. Bỏ tick chỉ là tạm cất, không mất dữ liệu.
      </p>

      <div className="mt-8">
        <PageList pages={list} />
      </div>
    </main>
  );
}

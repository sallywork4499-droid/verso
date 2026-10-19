'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTY_LABEL } from '@/lib/scoring';
import type { Card, Difficulty, Page } from '@/lib/types';

const ORDER: Difficulty[] = ['phrase', 'sentence', 'paragraph'];

export default function PageList({ pages }: { pages: Page[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [list, setList] = useState(pages);
  const [q, setQ] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function toggleDefault(page: Page) {
    const next = !page.is_default;
    setList((l) => l.map((p) => (p.id === page.id ? { ...p, is_default: next } : p)));
    await supabase.from('pages').update({ is_default: next }).eq('id', page.id);
    router.refresh();
  }

  async function removePage(page: Page) {
    if (!confirm(`Xoá đoạn "${page.title}" và toàn bộ mục trong đó?`)) return;
    setList((l) => l.filter((p) => p.id !== page.id));
    await supabase.from('pages').delete().eq('id', page.id);
    router.refresh();
  }

  if (list.length === 0) {
    return (
      <p className="leading-relaxed text-muted">
        Thư viện đang trống. Nạp tài liệu đầu tiên để bắt đầu.
      </p>
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = needle ? list.filter((p) => p.title.toLowerCase().includes(needle)) : list;

  return (
    <>
      {list.length > 4 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm đoạn…"
          className="mb-4 w-full rounded-2xl bg-card px-4 py-3 shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
        />
      )}
      {shown.length === 0 && (
        <p className="leading-relaxed text-muted">Không có đoạn nào khớp.</p>
      )}
    <ul className="space-y-3">
      {shown.map((page) => (
        <li key={page.id} className="rounded-2xl bg-card shadow-card">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => toggleDefault(page)}
              aria-label={page.is_default ? 'Thôi luyện đoạn này' : 'Luyện đoạn này'}
              className={`h-5 w-5 shrink-0 rounded border transition-colors ${
                page.is_default ? 'border-brand bg-brand' : 'border-line'
              }`}
            />
            <button onClick={() => setOpen(open === page.id ? null : page.id)} className="flex-1 text-left">
              <p className={page.is_default ? 'text-ink' : 'text-muted'}>{page.title}</p>
              <p className="mt-0.5 text-xs text-muted">{page.card_count} mục</p>
            </button>
            <button onClick={() => removePage(page)} className="px-2 text-sm text-muted hover:text-rose">
              Xoá
            </button>
          </div>
          {open === page.id && <CardEditor pageId={page.id} />}
        </li>
      ))}
    </ul>
    </>
  );
}

function CardEditor({ pageId }: { pageId: string }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let alive = true;
    supabase
      .from('cards')
      .select('id,page_id,vi_text,en_text,difficulty,times_seen,times_correct,streak,next_due_at')
      .eq('page_id', pageId)
      .order('created_at')
      .then(({ data }) => {
        if (alive) setCards((data ?? []) as Card[]);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  if (cards === null) {
    return <p className="px-4 pb-4 text-sm text-muted">Đang mở…</p>;
  }

  async function save(card: Card, field: 'vi_text' | 'en_text' | 'difficulty', value: string) {
    setCards((cs) => cs!.map((c) => (c.id === card.id ? { ...c, [field]: value } : c)));
    await supabase.from('cards').update({ [field]: value }).eq('id', card.id);
  }

  async function remove(card: Card) {
    setCards((cs) => cs!.filter((c) => c.id !== card.id));
    await supabase.from('cards').delete().eq('id', card.id);
  }

  async function add() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: created } = await supabase
      .from('cards')
      .insert({
        page_id: pageId,
        user_id: data.user.id,
        vi_text: 'Câu tiếng Việt',
        en_text: 'English sentence',
        difficulty: 'sentence',
      })
      .select()
      .single();
    if (created) setCards((cs) => [...(cs ?? []), created as Card]);
  }

  return (
    <div className="space-y-3 border-t border-line p-4">
      {cards.length === 0 && <p className="text-sm text-muted">Đoạn này chưa có mục nào.</p>}
      {cards.map((card) => (
        <div key={card.id} className="rounded-xl bg-sand p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <select
              value={card.difficulty}
              onChange={(e) => save(card, 'difficulty', e.target.value)}
              className="rounded bg-ink px-2 py-1 text-muted focus:outline-none"
            >
              {ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </select>
            <span>
              {card.times_correct}/{card.times_seen} đúng
              <button onClick={() => remove(card)} className="ml-3 hover:text-rose">
                Xoá
              </button>
            </span>
          </div>
          <textarea
            defaultValue={card.vi_text}
            onBlur={(e) => save(card, 'vi_text', e.target.value)}
            rows={2}
            className="w-full resize-none rounded bg-transparent font-study text-sm text-ink focus:outline-none"
          />
          <textarea
            defaultValue={card.en_text}
            onBlur={(e) => save(card, 'en_text', e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded border-t border-line bg-transparent pt-2 text-sm text-muted focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full rounded-xl border border-dashed border-line py-2.5 text-sm text-muted hover:border-brand/60 hover:text-brand"
      >
        Thêm câu thủ công
      </button>
    </div>
  );
}

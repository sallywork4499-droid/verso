import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Difficulty } from '@/lib/types';

const BATCH = 12;

/**
 * Bốc một lô câu cho màn hình luyện.
 * Thứ tự ưu tiên: câu tới hạn ôn lại -> câu chưa gặp bao giờ -> random trong kho.
 * Câu đang sai trong phiên do client tự chèn lại, không đi qua route này.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const url = new URL(req.url);
  const difficulty = (url.searchParams.get('difficulty') ?? 'sentence') as Difficulty;
  const exclude = (url.searchParams.get('exclude') ?? '').split(',').filter(Boolean);

  const COLS =
    'id,page_id,vi_text,en_text,difficulty,times_seen,times_correct,streak,next_due_at,pages!inner(is_default)';

  // Nối thẳng sang bảng pages để lọc kho mặc định trong cùng một câu hỏi,
  // khỏi phải hỏi danh sách trang bài trước rồi mới hỏi câu
  const base = () =>
    supabase
      .from('cards')
      .select(COLS)
      .eq('user_id', user.id)
      .eq('difficulty', difficulty)
      .eq('pages.is_default', true);

  let dueQ = base().lte('next_due_at', new Date().toISOString()).order('next_due_at').limit(BATCH);
  let restQ = base().order('times_seen').limit(BATCH * 2);
  if (exclude.length) {
    const list = `(${exclude.join(',')})`;
    dueQ = dueQ.not('id', 'in', list);
    restQ = restQ.not('id', 'in', list);
  }

  // Ba câu hỏi độc lập, chạy cùng lúc
  const [dueRes, restRes, pageCount] = await Promise.all([
    dueQ,
    restQ,
    supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_default', true),
  ]);

  if (dueRes.error) return NextResponse.json({ error: dueRes.error.message }, { status: 500 });

  if ((pageCount.count ?? 0) === 0) {
    return NextResponse.json({ cards: [], reason: 'empty_library' });
  }

  // Ưu tiên câu tới hạn, thiếu thì bù bằng câu ít gặp nhất, bỏ trùng
  const strip = <T extends { pages?: unknown }>(c: T) => {
    const { pages: _drop, ...rest } = c;
    return rest;
  };
  const seen = new Set<string>();
  const cards = [...(dueRes.data ?? []), ...(restRes.data ?? [])]
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .slice(0, BATCH)
    .map(strip);

  // Xáo trộn để không lặp lại cùng một thứ tự mỗi lần mở app
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return NextResponse.json({
    cards,
    reason: cards.length === 0 ? 'no_cards_at_difficulty' : null,
  });
}

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

  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true);

  const pageIds = (pages ?? []).map((p) => p.id);
  if (pageIds.length === 0) {
    return NextResponse.json({ cards: [], reason: 'empty_library' });
  }

  const base = () =>
    supabase
      .from('cards')
      .select('id,page_id,vi_text,en_text,difficulty,times_seen,times_correct,streak,next_due_at')
      .eq('user_id', user.id)
      .eq('difficulty', difficulty)
      .in('page_id', pageIds);

  let query = base().lte('next_due_at', new Date().toISOString()).order('next_due_at').limit(BATCH);
  if (exclude.length) query = query.not('id', 'in', `(${exclude.join(',')})`);
  const { data: due, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let cards = due ?? [];

  // Chưa đủ một lô thì lấy thêm câu chưa tới hạn, ưu tiên câu ít gặp nhất
  if (cards.length < BATCH) {
    const have = [...cards.map((c) => c.id), ...exclude];
    let more = base().order('times_seen').limit(BATCH - cards.length);
    if (have.length) more = more.not('id', 'in', `(${have.join(',')})`);
    const { data: extra } = await more;
    cards = [...cards, ...(extra ?? [])];
  }

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

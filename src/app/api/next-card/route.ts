import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeLevels, pickBatch } from '@/lib/session';
import type { Card } from '@/lib/types';

const BATCH = 12;
/** Trần số câu lấy về một lượt. Một đoạn thường vài chục câu, học cả chục đoạn vẫn dư. */
const POOL_CAP = 600;

/**
 * Bốc một lô câu cho màn hình luyện, chỉ trong những đoạn đang chọn
 * và những mức đang chọn.
 *
 * Nhận POST vì danh sách câu cần bỏ qua (đã đúng trong phiên, đang nằm trong
 * hàng đợi) có thể dài tới vài trăm mã, nhét lên URL sẽ vượt giới hạn.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  let body: { levels?: string[]; exclude?: string[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const levels = normalizeLevels(body.levels);
  const exclude = new Set((body.exclude ?? []).filter((x) => typeof x === 'string').slice(0, 2000));

  // Hai câu hỏi độc lập, chạy cùng lúc
  const [cardsRes, pagesRes] = await Promise.all([
    supabase
      .from('cards')
      .select(
        'id,page_id,vi_text,en_text,difficulty,times_seen,times_correct,streak,next_due_at,pages!inner(is_default)',
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .eq('pages.is_default', true)
      .in('difficulty', levels)
      .limit(POOL_CAP),
    supabase.from('pages').select('id,is_default').eq('user_id', user.id),
  ]);

  if (cardsRes.error) {
    return NextResponse.json({ error: cardsRes.error.message }, { status: 500 });
  }

  const pages = pagesRes.data ?? [];
  if (pages.length === 0) {
    return NextResponse.json({ cards: [], total: 0, reason: 'empty_library' });
  }
  if (!pages.some((p) => p.is_default)) {
    return NextResponse.json({ cards: [], total: 0, reason: 'no_selection' });
  }

  const all = (cardsRes.data ?? []).map((c) => {
    const { pages: _drop, ...rest } = c as typeof c & { pages?: unknown };
    return rest as Card;
  });
  const total = cardsRes.count ?? all.length;

  if (total === 0) {
    return NextResponse.json({ cards: [], total: 0, reason: 'no_cards_at_level' });
  }

  const batch = pickBatch(all, exclude, BATCH);

  // Xáo trong lô để không lặp đúng một thứ tự mỗi lần mở app
  for (let i = batch.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [batch[i], batch[j]] = [batch[j], batch[i]];
  }

  return NextResponse.json({ cards: batch, total, reason: null });
}

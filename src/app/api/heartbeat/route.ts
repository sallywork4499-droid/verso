import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Ghi thời gian ở trên màn hình luyện và số lần mở app trong ngày. */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  let body: { seconds?: number; isOpen?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const seconds = Math.min(Math.max(Math.round(body.seconds ?? 0), 0), 900);

  await supabase.rpc('log_activity', {
    p_seconds: seconds,
    p_cards: 0,
    p_opens: body.isOpen ? 1 : 0,
    p_points: 0,
  });

  return NextResponse.json({ ok: true });
}

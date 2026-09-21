import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pointsFor, nextDueAt, badgesEarned } from '@/lib/scoring';
import type { Difficulty } from '@/lib/types';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  let body: {
    cardId?: string;
    answer?: string;
    isCorrect?: boolean;
    firstTry?: boolean;
    comboCount?: number;
    feedback?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const { cardId, answer, isCorrect, firstTry = true, comboCount = 0, feedback } = body;
  if (!cardId || typeof answer !== 'string' || typeof isCorrect !== 'boolean') {
    return NextResponse.json({ error: 'Thiếu dữ liệu bài làm' }, { status: 400 });
  }

  const { data: card } = await supabase
    .from('cards')
    .select('id,difficulty,times_seen,times_correct,streak')
    .eq('id', cardId)
    .eq('user_id', user.id)
    .single();

  if (!card) return NextResponse.json({ error: 'Không tìm thấy câu này' }, { status: 404 });

  const points = isCorrect
    ? pointsFor(card.difficulty as Difficulty, { firstTry, comboCount })
    : 0;

  const { data: before } = await supabase
    .from('profiles')
    .select('total_points,current_streak')
    .eq('id', user.id)
    .single();

  await supabase.from('attempts').insert({
    card_id: cardId,
    user_id: user.id,
    user_answer: answer,
    is_correct: isCorrect,
    first_try: firstTry,
    points_earned: points,
    llm_feedback: feedback ?? null,
  });

  const newStreak = isCorrect ? card.streak + 1 : 0;
  await supabase
    .from('cards')
    .update({
      times_seen: card.times_seen + 1,
      times_correct: card.times_correct + (isCorrect ? 1 : 0),
      streak: newStreak,
      // Sai thì tới hạn ngay: câu quay lại trong chính phiên này
      next_due_at: isCorrect ? nextDueAt(newStreak) : new Date().toISOString(),
    })
    .eq('id', cardId);

  const { data: profile } = await supabase.rpc('log_activity', {
    p_seconds: 0,
    p_cards: isCorrect ? 1 : 0,
    p_opens: 0,
    p_points: points,
  });

  let newBadges: string[] = [];
  if (profile && before) {
    newBadges = badgesEarned(profile.total_points, profile.current_streak, {
      points: before.total_points,
      streak: before.current_streak,
    });
    if (newBadges.length) {
      await supabase
        .from('badges')
        .insert(newBadges.map((badge_key) => ({ user_id: user.id, badge_key })));
    }
  }

  // Số câu đã xong hôm nay, để client cập nhật vòng mục tiêu
  let doneToday: number | null = null;
  if (profile) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: profile.timezone ?? 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const { data: log } = await supabase
      .from('daily_logs')
      .select('cards_completed')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle();
    doneToday = log?.cards_completed ?? 0;
  }

  return NextResponse.json({ points, profile, newBadges, doneToday });
}

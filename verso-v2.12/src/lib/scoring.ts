import type { Difficulty } from './types';

export const BASE_POINTS: Record<Difficulty, number> = {
  phrase: 10,
  sentence: 30,
  paragraph: 100,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  phrase: 'Cụm từ',
  sentence: 'Câu',
  paragraph: 'Đoạn',
};

/**
 * Điểm cho một câu đã dịch đúng.
 * comboCount đã tính cả câu đang chấm.
 * - Cụm từ: điểm cơ bản, không hệ số.
 * - Câu: x1.2 khi câu này là câu đúng thứ 3 liên tiếp trở lên.
 * - Đoạn: x1.5 khi đúng ngay lần đầu.
 * Câu phải sửa nhiều lần mới đúng vẫn được điểm cơ bản, không nhân hệ số.
 */
export function pointsFor(
  difficulty: Difficulty,
  opts: { firstTry: boolean; comboCount: number }
): number {
  const base = BASE_POINTS[difficulty];
  if (!opts.firstTry) return base;

  if (difficulty === 'sentence' && opts.comboCount >= 3) {
    return Math.round(base * 1.2);
  }
  if (difficulty === 'paragraph') {
    return Math.round(base * 1.5);
  }
  return base;
}

/** Khoảng cách gặp lại: 1 ngày -> 3 -> 7 -> 21, tính theo số lần đúng liên tiếp. */
const INTERVALS_DAYS = [1, 3, 7, 21];

export function nextDueAt(correctStreak: number): string {
  const idx = Math.min(Math.max(correctStreak, 1), INTERVALS_DAYS.length) - 1;
  const days = INTERVALS_DAYS[idx];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const POINT_BADGES = [1000, 5000, 10000, 50000, 100000];
export const STREAK_BADGES = [7, 30, 100, 365];

export function badgesEarned(
  totalPoints: number,
  streak: number,
  before: { points: number; streak: number }
): string[] {
  const out: string[] = [];
  for (const m of POINT_BADGES) {
    if (before.points < m && totalPoints >= m) out.push(`points_${m}`);
  }
  for (const m of STREAK_BADGES) {
    if (before.streak < m && streak >= m) out.push(`streak_${m}`);
  }
  return out;
}

export function badgeLabel(key: string): string {
  const [kind, value] = key.split('_');
  if (kind === 'points') return `${Number(value).toLocaleString('vi-VN')} điểm`;
  return `${value} ngày liên tục`;
}

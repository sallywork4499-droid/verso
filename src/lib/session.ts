/**
 * Logic hàng đợi của một phiên luyện, tách riêng để test được.
 * Không phụ thuộc React, không gọi mạng.
 */
import type { Card } from './types';

/** Câu sai quay lại sau chừng này câu khác. */
export const REINSERT_GAP = 3;

/** Dịch đúng: bỏ câu ra khỏi hàng đợi. */
export function afterCorrect(queue: Card[]): Card[] {
  return queue.slice(1);
}

/**
 * Dịch sai: chèn câu trở lại sau vài câu khác.
 * Kho còn ít hơn REINSERT_GAP thì chèn vào cuối, không bao giờ bỏ câu đi.
 */
export function afterWrong(queue: Card[]): Card[] {
  const [card, ...rest] = queue;
  if (!card) return rest;
  const at = Math.min(REINSERT_GAP, rest.length);
  return [...rest.slice(0, at), card, ...rest.slice(at)];
}

/**
 * Nạp thêm câu từ server: nối vào cuối, bỏ câu đã có trong hàng đợi.
 * Không bao giờ ghi đè hàng đợi hiện tại, vì trong đó có thể đang giữ câu chờ sửa.
 */
export function mergeQueue(current: Card[], incoming: Card[]): Card[] {
  const have = new Set(current.map((c) => c.id));
  return [...current, ...incoming.filter((c) => !have.has(c.id))];
}

/** Ngày theo múi giờ người dùng, dạng YYYY-MM-DD. */
export function dateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Danh sách ngày lùi về quá khứ, mới nhất ở cuối. */
export function lastDays(count: number, timezone: string, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(dateKey(d, timezone));
  }
  return out;
}

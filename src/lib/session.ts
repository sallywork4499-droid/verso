/**
 * Logic hàng đợi của một phiên luyện, tách riêng để test được.
 * Không phụ thuộc React, không gọi mạng.
 */
import type { Card, Difficulty } from './types';

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

/* ============================================================
 * Học theo đoạn: chọn nhiều đoạn và nhiều mức cùng lúc
 * ============================================================ */

export const ALL_LEVELS: Difficulty[] = ['phrase', 'sentence', 'paragraph'];

/** Chuẩn hoá danh sách mức: đúng thứ tự, không trùng, rỗng thì lấy cả ba. */
export function normalizeLevels(levels: readonly string[] | null | undefined): Difficulty[] {
  const set = new Set(levels ?? []);
  const out = ALL_LEVELS.filter((l) => set.has(l));
  return out.length ? out : [...ALL_LEVELS];
}

/**
 * Chữ ký của một lựa chọn học. Đổi đoạn hay đổi mức là chữ ký đổi,
 * và mọi thứ gắn với lựa chọn cũ (hàng đợi, tiến độ) bị bỏ đi.
 * Thứ tự chọn không quan trọng: chọn A rồi B cũng như chọn B rồi A.
 */
export function selectionKey(pageIds: readonly string[], levels: readonly Difficulty[]): string {
  return [...pageIds].sort().join(',') + '|' + normalizeLevels(levels).join(',');
}

/** Tiến độ của lựa chọn hiện tại: đã dịch đúng bao nhiêu trên tổng số. */
export function progressOf(doneIds: ReadonlySet<string>, total: number) {
  const done = Math.min(doneIds.size, total);
  return {
    done,
    total,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    finished: total > 0 && done >= total,
  };
}

/** Tên hiện trên nút chọn đoạn: một đoạn thì hiện tên, nhiều đoạn thì đếm. */
export function selectionLabel(
  selected: readonly { title: string }[],
  totalPages: number
): string {
  if (selected.length === 0) return 'Chọn đoạn';
  if (selected.length === totalPages && totalPages > 1) return `Tất cả ${totalPages} đoạn`;
  if (selected.length === 1) return selected[0].title;
  return `${selected.length} đoạn`;
}

/**
 * Chọn câu cho lượt tới từ toàn bộ câu của lựa chọn.
 * Bỏ những câu đã đúng hoặc đang nằm trong hàng đợi, ưu tiên câu tới hạn ôn,
 * rồi tới câu ít gặp nhất. Không ép thứ tự cụm từ trước câu sau.
 */
export function pickBatch(
  cards: readonly Card[],
  exclude: ReadonlySet<string>,
  size: number,
  now: Date = new Date()
): Card[] {
  const t = now.getTime();
  const pool = cards.filter((c) => !exclude.has(c.id));
  const due = pool
    .filter((c) => new Date(c.next_due_at).getTime() <= t)
    .sort((a, b) => new Date(a.next_due_at).getTime() - new Date(b.next_due_at).getTime());
  const rest = pool
    .filter((c) => new Date(c.next_due_at).getTime() > t)
    .sort((a, b) => a.times_seen - b.times_seen);
  return [...due, ...rest].slice(0, size);
}

/**
 * Cỡ chữ cho đề bài, co theo độ dài.
 * Đoạn ngắn thì chữ to cho dễ đọc; đoạn dài thì nhỏ lại để lọt nhiều dòng hơn
 * trong khoảng màn hình còn trống phía trên bàn phím.
 */
export function promptFont(text: string): { size: number; lineHeight: number } {
  const n = text.trim().length;
  if (n <= 60) return { size: 26, lineHeight: 1.45 };
  if (n <= 140) return { size: 22, lineHeight: 1.5 };
  if (n <= 300) return { size: 19, lineHeight: 1.55 };
  if (n <= 600) return { size: 17, lineHeight: 1.6 };
  return { size: 16, lineHeight: 1.62 };
}

/** Số dòng khởi điểm của ô nhập: bắt đầu nhỏ rồi tự cao dần theo lượng chữ. */
export const ANSWER_MIN_ROWS = 2;

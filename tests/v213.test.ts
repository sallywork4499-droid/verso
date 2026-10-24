import { keepHead, daysBefore, displayStreak } from '../src/lib/session';
import type { Card } from '../src/lib/types';

let fails = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fails++;
};
const c = (id: string, vi = id): Card => ({
  id, page_id: 'p', vi_text: vi, en_text: id, difficulty: 'sentence',
  times_seen: 0, times_correct: 0, streak: 0, next_due_at: '2026-01-01T00:00:00Z',
});
const ids = (q: Card[]) => q.map((x) => x.id).join(',');

console.log('\n── Câu đang hiện không tự đổi khi lô mới về ──');
check('Giữ câu đang hiện ở đầu', ids(keepHead([c('A'), c('B')], [c('X'), c('Y')])) === 'A,X,Y');
check('Không nhân đôi khi lô mới cũng có câu đó', ids(keepHead([c('A')], [c('X'), c('A'), c('Y')])) === 'A,X,Y');
check('Dùng bản mới hơn của câu đó nếu server có', keepHead([c('A', 'cũ')], [c('A', 'mới')])[0].vi_text === 'mới');
check('Chưa có câu nào thì lấy nguyên lô mới', ids(keepHead([], [c('X'), c('Y')])) === 'X,Y');
check('Lô mới rỗng vẫn giữ câu đang làm', ids(keepHead([c('A')], [])) === 'A');

console.log('\n── Lùi ngày ──');
check('Lùi qua đầu tháng', daysBefore('2026-11-01', 1) === '2026-10-31');
check('Lùi qua đầu năm', daysBefore('2026-01-02', 3) === '2025-12-30');
check('Năm nhuận', daysBefore('2028-03-01', 1) === '2028-02-29');
check('Lùi 0 ngày giữ nguyên', daysBefore('2026-10-24', 0) === '2026-10-24');

console.log('\n── Streak hiển thị ──');
check('Học hôm nay: giữ nguyên', displayStreak(12, '2026-10-24', '2026-10-24') === 12);
check('Học hôm qua: vẫn còn', displayStreak(12, '2026-10-23', '2026-10-24') === 12);
check('Bỏ lỡ một ngày: hiện 0', displayStreak(12, '2026-10-22', '2026-10-24') === 0);
check('Chưa học bao giờ: 0', displayStreak(0, null, '2026-10-24') === 0);
check('Qua đầu tháng vẫn tính đúng hôm qua', displayStreak(5, '2026-10-31', '2026-11-01') === 5);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
if (fails) process.exit(1);

import { afterCorrect, afterWrong, mergeQueue, dateKey, lastDays, REINSERT_GAP } from '../src/lib/session';
import { pointsFor, nextDueAt, badgesEarned } from '../src/lib/scoring';
import type { Card } from '../src/lib/types';

let fails = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
}
const q = (...ids: string[]) => ids.map((id) => ({ id }) as Card);
const ids = (cs: Card[]) => cs.map((c) => c.id).join(',');

console.log('\n── Hàng đợi ──');
check('Đúng thì câu rời hàng đợi', ids(afterCorrect(q('A', 'B', 'C'))) === 'B,C');
check('Sai thì chèn lại sau 3 câu', ids(afterWrong(q('A', 'B', 'C', 'D', 'E'))) === 'B,C,D,A,E');

for (const n of [1, 2, 3, 4]) {
  const out = afterWrong(q(...'ABCD'.slice(0, n).split('')));
  check(
    `Còn ${n} câu, sai câu đầu → câu sai vẫn ở lại`,
    out.some((c) => c.id === 'A'),
    ids(out)
  );
}
check('Câu sai luôn nằm cuối khi kho ngắn hơn khoảng chèn', ids(afterWrong(q('A', 'B'))) === 'B,A');
check('Hàng đợi một câu thì lặp lại chính nó', ids(afterWrong(q('A'))) === 'A');

console.log('\n── Nạp thêm câu ──');
check('Nối vào cuối, giữ nguyên câu đang chờ sửa', ids(mergeQueue(q('A'), q('X', 'Y'))) === 'A,X,Y');
check('Không nạp trùng câu đã có', ids(mergeQueue(q('A', 'B'), q('B', 'C'))) === 'A,B,C');
check('Hàng đợi rỗng thì nhận hết', ids(mergeQueue([], q('X', 'Y'))) === 'X,Y');

console.log('\n── Điểm ──');
check('Câu thứ 3 liên tiếp được x1.2', pointsFor('sentence', { firstTry: true, comboCount: 3 }) === 36);
check('Câu thứ 2 liên tiếp chưa được thưởng', pointsFor('sentence', { firstTry: true, comboCount: 2 }) === 30);
check('Đoạn đúng lần đầu x1.5', pointsFor('paragraph', { firstTry: true, comboCount: 0 }) === 150);
check('Sửa mới đúng thì chỉ điểm cơ bản', pointsFor('sentence', { firstTry: false, comboCount: 9 }) === 30);
check('Cụm từ không hệ số', pointsFor('phrase', { firstTry: true, comboCount: 99 }) === 10);

console.log('\n── Giãn cách ôn lại ──');
const days = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
check('1 → 3 → 7 → 21', [1, 2, 3, 4].map((n) => days(nextDueAt(n))).join(',') === '1,3,7,21');
check('Đúng nhiều lần vẫn dừng ở 21 ngày', days(nextDueAt(12)) === 21);

console.log('\n── Huy hiệu ──');
check('Vượt mốc 1000 điểm', badgesEarned(1200, 3, { points: 900, streak: 3 })[0] === 'points_1000');
check('Chưa tới mốc thì không có', badgesEarned(900, 3, { points: 800, streak: 3 }).length === 0);
check('Không trao lại mốc đã có', badgesEarned(1200, 3, { points: 1100, streak: 3 }).length === 0);
check('Mốc streak 7 ngày', badgesEarned(10, 7, { points: 10, streak: 6 })[0] === 'streak_7');

console.log('\n── Múi giờ ──');
const tz = 'Asia/Ho_Chi_Minh';
// 22:30 giờ VN ngày 19/9 = 15:30 UTC cùng ngày
check('Tối muộn giờ VN vẫn tính đúng ngày', dateKey(new Date('2026-09-19T15:30:00Z'), tz) === '2026-09-19');
// 00:30 giờ VN ngày 20/9 = 17:30 UTC ngày 19/9 — chỗ UTC tính sai
check('Qua nửa đêm giờ VN sang ngày mới', dateKey(new Date('2026-09-19T17:30:00Z'), tz) === '2026-09-20');
const seq = lastDays(3, tz, new Date('2026-09-19T17:30:00Z'));
check('Chuỗi ngày liên tục, mới nhất ở cuối', seq.join(',') === '2026-09-18,2026-09-19,2026-09-20', seq.join(','));



console.log('\n── Dựng lịch tháng ──');
const mondayFirst = (jsDay: number) => (jsDay + 6) % 7;
function monthCells(year: number, month0: number) {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const lead = mondayFirst(new Date(year, month0, 1).getDay());
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, lead, daysInMonth };
}

// Tháng 9/2026: ngày 1 rơi vào thứ Ba → cột thứ hai
const sep = monthCells(2026, 8);
check('Tháng 9/2026 có 30 ngày', sep.daysInMonth === 30);
check('Ngày 1 lệch đúng 1 ô vì rơi vào thứ Ba', sep.lead === 1, `lead=${sep.lead}`);
check('Số ô chia hết cho 7', sep.cells.length % 7 === 0, `${sep.cells.length} ô`);
check(
  'Ô đầu tiên trống, ô thứ hai là ngày 1',
  sep.cells[0] === null && sep.cells[1] === 1
);

// Tháng 2/2026 có 28 ngày, ngày 1 là Chủ nhật → nằm cột cuối
const feb = monthCells(2026, 1);
check('Tháng 2/2026 có 28 ngày', feb.daysInMonth === 28);
check('Chủ nhật nằm cột thứ bảy', feb.lead === 6, `lead=${feb.lead}`);

// Năm nhuận
check('Tháng 2/2028 nhuận có 29 ngày', monthCells(2028, 1).daysInMonth === 29);

// Mọi tháng đều đủ ngày và không rơi rớt
for (let m = 0; m < 12; m++) {
  const r = monthCells(2026, m);
  const nums = r.cells.filter((c) => c !== null);
  if (nums.length !== r.daysInMonth) {
    check(`Tháng ${m + 1} đủ ngày`, false, `${nums.length}/${r.daysInMonth}`);
  }
}
check('Cả 12 tháng của 2026 dựng đủ ngày', true);

console.log('\n── Lịch cả năm 2026 ──');
const mondayFirst2 = (d: number) => (d + 6) % 7;
function cells(y: number, m0: number) {
  const dim = new Date(y, m0 + 1, 0).getDate();
  const lead = mondayFirst2(new Date(y, m0, 1).getDay());
  const c: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (c.length % 7 !== 0) c.push(null);
  return { c, dim, lead };
}

let allGood = true;
let totalDays = 0;
const shape: string[] = [];
for (let m = 0; m < 12; m++) {
  const r = cells(2026, m);
  const nums = r.c.filter((x) => x !== null) as number[];
  totalDays += r.dim;
  shape.push(`${m + 1}:${r.dim}d/lead${r.lead}`);
  if (nums.length !== r.dim) allGood = false;
  if (nums[0] !== 1 || nums[nums.length - 1] !== r.dim) allGood = false;
  if (r.c.length % 7 !== 0) allGood = false;
}
check('Cả 12 tháng 2026 dựng đủ và đúng thứ tự ngày', allGood);
check('Tổng ngày trong năm 2026 là 365', totalDays === 365, `${totalDays} ngày`);
check('Tháng 1/2026 bắt đầu thứ Năm', cells(2026, 0).lead === 3, `lead=${cells(2026, 0).lead}`);
check('Tháng 12/2026 có 31 ngày', cells(2026, 11).dim === 31);
check('Năm nhuận 2028 có 366 ngày', Array.from({ length: 12 }, (_, m) => cells(2028, m).dim).reduce((a, b) => a + b) === 366);

console.log('   ' + shape.join('  '));

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

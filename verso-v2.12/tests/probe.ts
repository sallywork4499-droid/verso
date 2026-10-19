/**
 * Kịch bản dò lỗi: mô phỏng đúng luồng trong Practice.tsx hiện tại
 * để xem hành vi thật có khớp với yêu cầu trong brief không.
 */
import { pointsFor, nextDueAt } from '../src/lib/scoring';

let fails = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
}

console.log('\n── Điểm ──');

// Brief: "Câu: x1.2 khi đúng 3 câu liên tiếp"
// Practice.tsx truyền comboCount = số câu đúng liên tiếp TRƯỚC câu này.
// Câu thứ 3 liên tiếp => comboCount = 2.
const cau3 = pointsFor('sentence', { firstTry: true, comboCount: 2 });
check('Câu đúng thứ 3 liên tiếp được x1.2 (kỳ vọng 36)', cau3 === 36, `thực tế ${cau3}`);

const cau4 = pointsFor('sentence', { firstTry: true, comboCount: 3 });
check('Câu đúng thứ 4 liên tiếp vẫn x1.2 (kỳ vọng 36)', cau4 === 36, `thực tế ${cau4}`);

check('Đoạn đúng lần đầu x1.5', pointsFor('paragraph', { firstTry: true, comboCount: 0 }) === 150);
check('Đoạn sửa mới đúng chỉ điểm cơ bản', pointsFor('paragraph', { firstTry: false, comboCount: 9 }) === 100);
check('Cụm từ không nhân hệ số', pointsFor('phrase', { firstTry: true, comboCount: 99 }) === 10);

console.log('\n── Giãn cách ôn lại ──');
const days = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
check('Đúng lần 1 → 1 ngày', days(nextDueAt(1)) === 1);
check('Đúng lần 4 → 21 ngày', days(nextDueAt(4)) === 21);
check('Đúng lần 9 → vẫn 21 ngày', days(nextDueAt(9)) === 21);

console.log('\n── Hàng đợi câu (mô phỏng Practice.tsx) ──');

type C = { id: string };
const REINSERT_GAP = 3;

/** Mô phỏng y hệt advance() + loadQueue() hiện tại. */
function simulate(queue: C[], serverBatch: C[], action: 'correct' | 'wrong') {
  const card = queue[0];
  let next: C[];
  if (action === 'correct') {
    next = queue.slice(1);
  } else {
    const rest = queue.slice(1);
    const at = Math.min(REINSERT_GAP, rest.length);
    next = [...rest.slice(0, at), card, ...rest.slice(at)];
  }
  // advance(): setQueue(next); if (next.length <= 2) loadQueue() -> setQueue(cards_moi)
  if (next.length <= 2) next = serverBatch; // loadQueue GHI ĐÈ toàn bộ
  return next;
}

// Kho sắp cạn: còn 3 câu, câu đầu bị đánh sai
const nearEmpty: C[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
const fresh: C[] = [{ id: 'X' }, { id: 'Y' }, { id: 'Z' }];
const after = simulate(nearEmpty, fresh, 'wrong');
check(
  'Câu sai A phải còn trong hàng đợi để lặp lại',
  after.some((c) => c.id === 'A'),
  `hàng đợi sau: ${after.map((c) => c.id).join(',') || 'rỗng'}`
);

// Kho còn nhiều thì chèn lại đúng vị trí
const many: C[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ({ id }));
const after2 = simulate(many, fresh, 'wrong');
check(
  'Câu sai chèn lại sau đúng 3 câu khác',
  after2.map((c) => c.id).join(',') === 'B,C,D,A,E,F',
  after2.map((c) => c.id).join(',')
);

console.log('\n── firstTry (mô phỏng state của Practice.tsx) ──');
let firstTry = true;
const log: { card: string; firstTry: boolean }[] = [];
// Câu A sai
log.push({ card: 'A', firstTry });
firstTry = false; // judge(false) -> setFirstTry(false)
// Sang câu B hoàn toàn mới, chưa đụng bao giờ
log.push({ card: 'B', firstTry });
check(
  'Câu B mới tinh phải được tính là làm lần đầu',
  log[1].firstTry === true,
  `thực tế firstTry=${log[1].firstTry}`
);

console.log('\n── Múi giờ ──');
const utcToday = new Date().toISOString().slice(0, 10);
const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
check(
  'Ngày trên dashboard phải khớp ngày Việt Nam',
  utcToday === vnToday,
  `UTC=${utcToday} vs VN=${vnToday} (lệch khi user học buổi tối)`
);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai cần sửa.`}\n`);

console.log('── Hàng đợi khi kho gần cạn ──');
for (const n of [1, 2, 3]) {
  const q: C[] = ['A', 'B', 'C'].slice(0, n).map((id) => ({ id }));
  const out = simulate(q, fresh, 'wrong');
  check(
    `Còn ${n} câu, đánh sai câu đầu → câu sai vẫn phải quay lại`,
    out.some((c) => c.id === 'A'),
    `hàng đợi sau: ${out.map((c) => c.id).join(',')}`
  );
}

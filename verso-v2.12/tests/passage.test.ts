import {
  normalizeLevels,
  pickBatch,
  progressOf,
  selectionKey,
  selectionLabel,
  afterWrong,
  mergeQueue,
} from '../src/lib/session';
import type { Card } from '../src/lib/types';

let fails = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const NOW = new Date('2026-09-21T10:00:00Z');
const past = '2026-09-20T10:00:00Z';
const future = '2026-09-25T10:00:00Z';
function card(id: string, page: string, d: Card['difficulty'], due = past, seen = 0): Card {
  return {
    id, page_id: page, difficulty: d, vi_text: id, en_text: id,
    times_seen: seen, times_correct: 0, streak: 0, next_due_at: due,
  };
}
const ids = (cs: Card[]) => cs.map((c) => c.id).join(',');

console.log('\n── Chọn mức ──');
check('Rỗng thì lấy cả ba mức', normalizeLevels([]).join(',') === 'phrase,sentence,paragraph');
check('Null cũng lấy cả ba', normalizeLevels(null).length === 3);
check('Chỉ Đoạn', normalizeLevels(['paragraph']).join(',') === 'paragraph');
check('Câu và Đoạn, giữ đúng thứ tự', normalizeLevels(['paragraph', 'sentence']).join(',') === 'sentence,paragraph');
check('Bỏ mức lạ và mức trùng', normalizeLevels(['sentence', 'xyz', 'sentence']).join(',') === 'sentence');

console.log('\n── Chữ ký lựa chọn ──');
check('Thứ tự chọn đoạn không quan trọng',
  selectionKey(['b', 'a'], ['sentence']) === selectionKey(['a', 'b'], ['sentence']));
check('Đổi đoạn là đổi chữ ký',
  selectionKey(['a'], ['sentence']) !== selectionKey(['b'], ['sentence']));
check('Đổi mức là đổi chữ ký',
  selectionKey(['a'], ['sentence']) !== selectionKey(['a'], ['paragraph']));
check('Thêm một đoạn là đổi chữ ký',
  selectionKey(['a'], ['sentence']) !== selectionKey(['a', 'b'], ['sentence']));

console.log('\n── Tên trên nút chọn ──');
const p = (t: string) => ({ title: t });
check('Chưa chọn gì', selectionLabel([], 5) === 'Chọn đoạn');
check('Một đoạn thì hiện tên', selectionLabel([p('Đô thị hoá')], 5) === 'Đô thị hoá');
check('Vài đoạn thì đếm', selectionLabel([p('a'), p('b'), p('c')], 5) === '3 đoạn');
check('Chọn hết thì báo tất cả', selectionLabel([p('a'), p('b')], 2) === 'Tất cả 2 đoạn');
check('Chỉ có một đoạn thì vẫn hiện tên', selectionLabel([p('Duy nhất')], 1) === 'Duy nhất');

console.log('\n── Tiến độ ──');
check('Chưa làm gì', progressOf(new Set(), 12).pct === 0);
check('Làm được một nửa', progressOf(new Set(['a', 'b', 'c']), 6).pct === 50);
check('Xong hết thì báo hoàn thành', progressOf(new Set(['a', 'b']), 2).finished);
check('Chưa xong thì chưa báo', !progressOf(new Set(['a']), 2).finished);
check('Kho rỗng không tính là hoàn thành', !progressOf(new Set(), 0).finished);
check('Không vượt quá 100%', progressOf(new Set(['a', 'b', 'c']), 2).done === 2);

console.log('\n── Bốc câu trong lựa chọn ──');
const pool = [
  card('c1', 'A', 'phrase', future, 5),
  card('c2', 'A', 'sentence', past),
  card('c3', 'A', 'paragraph', future, 1),
  card('c4', 'A', 'sentence', '2026-09-19T10:00:00Z'),
];
check('Câu tới hạn lên trước, hạn sớm hơn trước nữa',
  ids(pickBatch(pool, new Set(), 2, NOW)) === 'c4,c2', ids(pickBatch(pool, new Set(), 2, NOW)));
check('Hết câu tới hạn thì lấy câu ít gặp nhất',
  ids(pickBatch(pool, new Set(['c2', 'c4']), 2, NOW)) === 'c3,c1');
check('Không bốc lại câu đã đúng', !pickBatch(pool, new Set(['c1']), 9, NOW).some((c) => c.id === 'c1'));
check('Bỏ hết thì trả rỗng, tức là xong đoạn', pickBatch(pool, new Set(['c1', 'c2', 'c3', 'c4']), 9, NOW).length === 0);
check('Không ép thứ tự cụm từ trước câu sau',
  pickBatch(pool, new Set(), 4, NOW)[0].difficulty === 'sentence');

console.log('\n── Đổi đoạn thì không dính câu đoạn cũ ──');
// Đang học đoạn A, sai một câu nên nó chờ quay lại trong hàng đợi
let queue = [card('a1', 'A', 'sentence'), card('a2', 'A', 'sentence'), card('a3', 'A', 'phrase')];
queue = afterWrong(queue);
check('Trước khi đổi: câu sai của A vẫn chờ quay lại', queue.some((c) => c.id === 'a1'));
// Đổi sang đoạn B: hàng đợi mới thay hẳn, không nối vào hàng đợi cũ
const fromB = [card('b1', 'B', 'sentence'), card('b2', 'B', 'phrase')];
const replaced = fromB;
check('Sau khi đổi: không còn câu nào của A', replaced.every((c) => c.page_id === 'B'));
// Trong khi đó, nạp thêm cùng lựa chọn thì vẫn nối như cũ
check('Còn trong cùng lựa chọn thì vẫn nối để giữ câu chờ sửa',
  mergeQueue(queue, [card('a9', 'A', 'phrase')]).some((c) => c.id === 'a1'));


console.log('\n── Kho lớn hơn trần một lô ──');
// 30 câu; những câu vừa dịch đúng có hạn ôn đẩy sang mai nên rơi xuống cuối
const big: Card[] = Array.from({ length: 30 }, (_, i) =>
  card(`b${i}`, 'A', 'sentence', i < 12 ? future : past, i)
);
const doneSet = new Set(big.filter((c) => c.next_due_at === future).map((c) => c.id));
const lo = pickBatch(big, doneSet, 10, NOW);
check('Không bốc lại câu đã đúng hôm nay', lo.every((c) => !doneSet.has(c.id)), `${lo.length} câu`);
check('Lấy đủ một lô khi kho còn nhiều', lo.length === 10);
check('Làm hết thì trả rỗng để báo xong', pickBatch(big, new Set(big.map((c) => c.id)), 10, NOW).length === 0);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

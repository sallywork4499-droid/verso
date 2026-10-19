import { promptFont } from '../src/lib/session';

let fails = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fails++;
};
const size = (s: string) => promptFont(s).size;
const rep = (n: number) => 'a'.repeat(n);

console.log('\n── Cỡ chữ đề bài ──');
check('Câu ngắn thì chữ to nhất', size('Chính phủ nên siết chặt quy định.') === 26);
check('Câu dài vừa thì nhỏ một bậc', size(rep(120)) === 22);
check('Đoạn ngắn nhỏ tiếp', size(rep(250)) === 19);
check('Đoạn dài nhỏ nữa', size(rep(500)) === 17);
check('Đoạn rất dài dừng ở cỡ nhỏ nhất', size(rep(2000)) === 16);
check('Không bao giờ nhỏ hơn 16', [0, 50, 200, 900, 5000].every((n) => promptFont(rep(n)).size >= 16));
check('Càng dài càng không to lên', (() => {
  const sizes = [10, 100, 200, 400, 800, 3000].map((n) => size(rep(n)));
  return sizes.every((s, i) => i === 0 || s <= sizes[i - 1]);
})());
check('Khoảng cách dòng giãn ra khi chữ nhỏ', promptFont(rep(2000)).lineHeight > promptFont('ngắn').lineHeight);
check('Bỏ qua khoảng trắng thừa hai đầu', size('   ' + rep(30) + '   ') === 26);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

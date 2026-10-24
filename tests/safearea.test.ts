import { fullHeight } from '../src/lib/useViewportFit';

let fails = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fails++;
};
const g = globalThis as unknown as Record<string, unknown>;
// Giả lập iPhone 17 Pro: màn hình 402 x 874 điểm
const device = (w: number, h: number, innerW: number, innerH: number) => {
  g.screen = { width: w, height: h };
  g.window = { innerWidth: innerW, innerHeight: innerH };
};

console.log('\n── Chiều cao khung app trên iPhone ──');
device(402, 874, 402, 812);
check('App từ màn hình chính, hụt 62 điểm: lấp đầy màn hình', fullHeight(812, true) === 874);
check('Mở trong Safari: giữ nguyên số trình duyệt báo', fullHeight(700, false) === 700);
check('Không hụt gì: giữ nguyên', fullHeight(874, true) === 874);
check('Hụt quá nhiều (lạ): không đoán bừa', fullHeight(500, true) === 500);
device(402, 874, 874, 380);
check('Xoay ngang: dùng cạnh ngắn', fullHeight(380, true) === 402);
device(874, 402, 402, 812);
check('screen báo ngược chiều vẫn đúng', fullHeight(812, true) === 874);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
if (fails) process.exit(1);

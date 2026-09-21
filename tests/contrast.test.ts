/**
 * Kiểm tra độ tương phản chữ trên nền, theo chuẩn WCAG AA.
 * Chữ thường cần từ 4.5, chữ lớn từ 3.0.
 */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const LIGHT = {
  page: '#FFF6F0',
  card: '#FFFFFF',
  sand: '#FDEDE3',
  brand: '#F97B3D',
  brandDeep: '#B84A14',
  lilacText: '#6E52C7',
  rose: '#C93F33',
  ink: '#2B2320',
  onBrand: '#2B2320',
  muted: '#74665E',
};
const DARK = {
  page: '#1C1614',
  card: '#251E1A',
  sand: '#2D241F',
  brand: '#FF8B4F',
  brandDeep: '#FFA66E',
  lilacText: '#B9A2FF',
  rose: '#F58070',
  ink: '#F2E9E3',
  onBrand: '#2B2320',
  muted: '#A2938B',
};

let fails = 0;
function check(name: string, fg: string, bg: string, min = 4.5) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name} — ${r.toFixed(2)} (cần ${min})`);
  if (!ok) fails++;
}

for (const [label, C] of [
  ['sáng', LIGHT],
  ['tối', DARK],
] as const) {
  console.log(`\n── Bảng ${label} ──`);
  check(`chữ chính trên nền`, C.ink, C.page);
  check(`chữ chính trên thẻ`, C.ink, C.card);
  check(`chữ phụ trên nền`, C.muted, C.page);
  check(`chữ phụ trên thẻ`, C.muted, C.card);
  check(`chữ trên nút cam`, C.onBrand, C.brand);
  check(`cam đậm làm chữ trên thẻ`, C.brandDeep, C.card);
  check(`đỏ báo lỗi trên thẻ`, C.rose, C.card);
  check(`tím làm chữ trên thẻ`, C.lilacText, C.card);
  check(`chữ phụ trên nền chìm`, C.muted, C.sand);
}

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ chưa đạt.`}\n`);
process.exit(fails === 0 ? 0 : 1);

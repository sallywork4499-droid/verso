/** Đăng xuất phải dọn sạch mọi thứ app để lại trên máy. */
async function wipeLocal(store: Record<string, string>, session: Record<string, string>, cacheKeys: string[]) {
  Object.keys(store)
    .filter((k) => k.startsWith('verso:'))
    .forEach((k) => delete store[k]);
  for (const k of Object.keys(session)) delete session[k];
  cacheKeys.length = 0;
}

let fails = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fails++;
};

const store: Record<string, string> = {
  'verso:queue': '[]',
  'verso:draft': 'x',
  'verso:theme': 'dark',
  'verso:done:2026-09-23:abc': '["c1"]',
  'app-khac:cai-dat': 'giu-lai',
};
const session: Record<string, string> = { 'verso:opened': '1' };
const cacheKeys = ['verso-v2'];

void wipeLocal(store, session, cacheKeys);

console.log('\n── Dọn dữ liệu khi đăng xuất ──');
check('Xoá hàng đợi', !('verso:queue' in store));
check('Xoá bản nháp', !('verso:draft' in store));
check('Xoá tiến độ theo ngày', !('verso:done:2026-09-23:abc' in store));
check('Xoá cả lựa chọn giao diện', !('verso:theme' in store));
check('Không đụng dữ liệu của app khác', store['app-khac:cai-dat'] === 'giu-lai');
check('Xoá dấu phiên trình duyệt', Object.keys(session).length === 0);
check('Xoá trang đã lưu của service worker', cacheKeys.length === 0);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

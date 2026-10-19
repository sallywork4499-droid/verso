/** Kiểm tra Gemini tự chuyển sang model khác khi model đầu không dùng được. */
import { gemini } from '../src/lib/ai/gemini';

let fails = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const realFetch = global.fetch;
const called: string[] = [];

/** Giả lập server: chỉ model trong danh sách `alive` là chạy được. */
function fakeServer(alive: string[], status = 404) {
  called.length = 0;
  global.fetch = (async (url: string) => {
    const model = String(url).split('/models/')[1].split(':')[0];
    called.push(model);
    if (alive.includes(model)) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      };
    }
    return { ok: false, status, text: async () => 'model not found' };
  }) as unknown as typeof fetch;
}

const ask = (models: string[]) =>
  gemini('k', models).askJson<{ ok: boolean }>({
    system: 's',
    parts: [{ kind: 'text', text: 't' }],
    maxTokens: 100,
  });

async function main() {
  console.log('\n── Tự chuyển model khi model đầu hỏng ──');

  fakeServer(['b']);
  const r1 = await ask(['a', 'b', 'c']);
  check('Model đầu 404 thì thử model kế', r1.ok === true);
  check('Dừng ngay khi tìm được model chạy', called.join(',') === 'a,b', called.join(','));

  fakeServer(['a']);
  await ask(['a', 'b']);
  check('Model đầu chạy thì không gọi thừa', called.join(',') === 'a', called.join(','));

  fakeServer([]);
  let msg = '';
  try {
    await ask(['a', 'b']);
  } catch (e) {
    msg = e instanceof Error ? e.message : '';
  }
  check('Hết model thì báo rõ đã thử những gì', msg.includes('a, b'), msg.slice(0, 70));

  console.log('\n── Lỗi cần dừng ngay, không thử tiếp ──');

  fakeServer([], 429);
  msg = '';
  try {
    await ask(['a', 'b']);
  } catch (e) {
    msg = e instanceof Error ? e.message : '';
  }
  check('Vượt hạn mức thì dừng ngay', called.length === 1, `gọi ${called.length} lần`);
  check('Nói rõ là vượt hạn mức miễn phí', msg.includes('hạn mức'));

  fakeServer([], 401);
  msg = '';
  try {
    await ask(['a', 'b']);
  } catch (e) {
    msg = e instanceof Error ? e.message : '';
  }
  check('Khoá sai thì dừng ngay', called.length === 1, `gọi ${called.length} lần`);
  check('Hướng dẫn tạo khoá mới', msg.includes('aistudio.google.com'));

  console.log('\n── Model quá tải thì thử model khác ──');

  // Model đầu báo 503, model sau rảnh
  called.length = 0;
  global.fetch = (async (url: string) => {
    const model = String(url).split('/models/')[1].split(':')[0];
    called.push(model);
    if (model === 'ranh') {
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) };
    }
    return {
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.' } }),
    };
  }) as unknown as typeof fetch;
  const r503 = await ask(['qua-tai', 'ranh']);
  check('Model đầu quá tải thì chuyển sang model sau', r503.ok === true, called.join(','));

  // Mọi model đều quá tải
  fakeServer([], 503);
  msg = '';
  try {
    await ask(['q1', 'q2', 'q3']);
  } catch (e) {
    msg = e instanceof Error ? e.message : '';
  }
  check('Thử hết cả danh sách trước khi bỏ cuộc', called.length === 3, `gọi ${called.length} lần`);
  check('Báo quá tải bằng câu dễ hiểu', msg.includes('quá tải'), msg.slice(0, 60));
  check('Không đổ nguyên JSON ra màn hình', !msg.includes('{'), msg.slice(0, 60));

  fakeServer([], 500);
  msg = '';
  try {
    await ask(['a', 'b']);
  } catch (e) {
    msg = e instanceof Error ? e.message : '';
  }
  check('Lỗi 500 cũng được coi là tạm thời', called.length === 2 && msg.includes('quá tải'));

  console.log('\n── Nhớ model đã chạy được ──');

  fakeServer(['c']);
  const models = ['x1', 'x2', 'c'];
  await ask(models);
  check('Lần đầu phải thử hết mới tới model sống', called.join(',') === 'x1,x2,c', called.join(','));

  fakeServer(['c']);
  await ask(models);
  check('Lần sau đi thẳng tới model đã biết', called.join(',') === 'c', called.join(','));

  // Model đang nhớ bỗng chết thì phải quên đi và dò lại
  fakeServer(['x2']);
  await ask(models);
  check('Model đã nhớ chết thì dò lại từ đầu', called.includes('x2'), called.join(','));

  global.fetch = realFetch;
  console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
  process.exit(fails === 0 ? 0 : 1);
}

main();

import { parseJson } from '../src/lib/ai/types';

let fails = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
}

console.log('\n── Bóc JSON từ câu trả lời của model ──');
check('JSON thuần', parseJson<{ a: number }>('{"a":1}').a === 1);
check('Có rào markdown', parseJson<{ a: number }>('```json\n{"a":2}\n```').a === 2);
check('Rào không ghi json', parseJson<{ a: number }>('```\n{"a":3}\n```').a === 3);
check('Có lời dẫn thừa', parseJson<{ a: number }>('Đây là kết quả:\n{"a":4}').a === 4);
check('Có chữ đuôi thừa', parseJson<{ a: number }>('{"a":5}\nHy vọng giúp ích!').a === 5);
check('Mảng ở gốc', parseJson<number[]>('[1,2,3]').length === 3);
check(
  'Chuỗi lồng dấu ngoặc vẫn đúng',
  parseJson<{ t: string }>('{"t":"anh ấy nói {xong} rồi"}').t === 'anh ấy nói {xong} rồi'
);
let threw = false;
try {
  parseJson('không có json ở đây');
} catch {
  threw = true;
}
check('Không có JSON thì ném lỗi rõ ràng', threw);

const env = { ...process.env };

async function main() {
  console.log('\n── Chọn nhà cung cấp theo biến môi trường ──');
  async function pick(vars: Record<string, string | undefined>, task: 'ingest' | 'grade') {
    for (const k of ['AI_PROVIDER', 'AI_PROVIDER_INGEST', 'AI_PROVIDER_GRADE', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_MODEL_INGEST', 'GEMINI_MODEL_GRADE']) {
      delete process.env[k];
    }
    Object.assign(process.env, vars);
    const mod = await import(`../src/lib/ai/index?${Math.random()}`);
    return mod.getProvider(task);
  }

  const gk = { GEMINI_API_KEY: 'g' };
  const ak = { ANTHROPIC_API_KEY: 'a' };

  check('Chỉ có khoá Gemini → dùng Gemini', (await pick(gk, 'grade'))?.name === 'gemini');
  check('Chỉ có khoá Claude → dùng Claude', (await pick(ak, 'grade'))?.name === 'anthropic');
  check('Có cả hai, không chỉ định → ưu tiên Gemini', (await pick({ ...gk, ...ak }, 'grade'))?.name === 'gemini');
  check(
    'AI_PROVIDER ép dùng Claude',
    (await pick({ ...gk, ...ak, AI_PROVIDER: 'anthropic' }, 'grade'))?.name === 'anthropic'
  );
  check(
    'Tách việc: đọc ảnh bằng Claude, chấm bài bằng Gemini',
    (await pick({ ...gk, ...ak, AI_PROVIDER: 'gemini', AI_PROVIDER_INGEST: 'anthropic' }, 'ingest'))?.name === 'anthropic' &&
      (await pick({ ...gk, ...ak, AI_PROVIDER: 'gemini', AI_PROVIDER_INGEST: 'anthropic' }, 'grade'))?.name === 'gemini'
  );
  check('Không có khoá nào → trả null, app không sập', (await pick({}, 'grade')) === null);
  check(
    'Model mặc định không còn thuộc dòng 2.5 sắp bị khai tử',
    (await pick(gk, 'ingest'))?.model.startsWith('gemini-3') === true,
    (await pick(gk, 'ingest'))?.model
  );
  check(
    'Đổi được model bằng biến môi trường',
    (await pick({ ...gk, GEMINI_MODEL_GRADE: 'model-cua-toi' }, 'grade'))?.model === 'model-cua-toi'
  );
  check(
    'Nhận nhiều model cách nhau bằng dấu phẩy',
    (await pick({ ...gk, GEMINI_MODEL_GRADE: ' a , b ' }, 'grade'))?.model === 'a'
  );
}

main().then(() => {
  Object.assign(process.env, env);
  console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
  process.exit(fails === 0 ? 0 : 1);
});

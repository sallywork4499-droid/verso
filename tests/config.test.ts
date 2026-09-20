/** Kiểm tra middleware phát hiện đúng các kiểu cấu hình sai. */
function configProblem(url?: string, key?: string): string | null {
  const u = url?.trim();
  const k = key?.trim();
  if (!u) return 'Thiếu biến NEXT_PUBLIC_SUPABASE_URL';
  if (!k) return 'Thiếu biến NEXT_PUBLIC_SUPABASE_ANON_KEY';
  try {
    const parsed = new URL(u);
    if (!parsed.protocol.startsWith('http')) return `NEXT_PUBLIC_SUPABASE_URL sai dạng: ${u}`;
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL không phải một địa chỉ hợp lệ: ${u}`;
  }
  if (k.length < 40) return 'NEXT_PUBLIC_SUPABASE_ANON_KEY trông quá ngắn, có thể dán thiếu';
  return null;
}

let fails = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const GOOD_URL = 'https://abcdefghijk.supabase.co';
const GOOD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijklmnopqrstuvwxyz0123456789';

console.log('\n── Bắt lỗi cấu hình ──');
check('Cấu hình đủ và đúng thì không báo gì', configProblem(GOOD_URL, GOOD_KEY) === null);
check('Thiếu URL', configProblem(undefined, GOOD_KEY)?.includes('Thiếu biến NEXT_PUBLIC_SUPABASE_URL') === true);
check('Thiếu khoá', configProblem(GOOD_URL, undefined)?.includes('Thiếu biến NEXT_PUBLIC_SUPABASE_ANON_KEY') === true);
check('URL rỗng cũng tính là thiếu', configProblem('   ', GOOD_KEY) !== null);
check('URL không phải địa chỉ', configProblem('abcxyz.supabase.co', GOOD_KEY) !== null);
check('Khoá dán thiếu, quá ngắn', configProblem(GOOD_URL, 'eyJhbGciOi') !== null);
check('Dư dấu cách hai đầu vẫn chấp nhận', configProblem(`  ${GOOD_URL}  `, `  ${GOOD_KEY}  `) === null);
check('URL có gạch chéo cuối vẫn chấp nhận', configProblem(GOOD_URL + '/', GOOD_KEY) === null);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

/** Kiểm tra bản dịch thông báo lỗi đăng nhập sang tiếng Việt. */
function viError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (m.includes('user already registered')) return 'Email này đã có tài khoản. Chuyển sang Đăng nhập nhé.';
  if (m.includes('password should be at least')) return 'Mật khẩu phải từ 6 ký tự trở lên.';
  if (m.includes('email not confirmed')) return 'Tài khoản chưa xác nhận email. Vào Supabase tắt mục Confirm email, hoặc mở email để xác nhận.';
  if (m.includes('unable to validate email')) return 'Địa chỉ email không hợp lệ.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Thử quá nhiều lần. Đợi một lát rồi làm lại.';
  if (m.includes('signups not allowed')) return 'Supabase đang tắt đăng ký. Bật lại ở Authentication → Sign In / Providers.';
  return raw;
}

let fails = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

console.log('\n── Thông báo lỗi đăng nhập ──');
check('Sai mật khẩu', viError('Invalid login credentials').includes('không đúng'));
check('Email đã đăng ký', viError('User already registered').includes('đã có tài khoản'));
check('Mật khẩu ngắn', viError('Password should be at least 6 characters').includes('6 ký tự'));
check('Chưa xác nhận email', viError('Email not confirmed').includes('Confirm email'));
check('Email sai định dạng', viError('Unable to validate email address').includes('không hợp lệ'));
check('Thử quá nhiều', viError('Email rate limit exceeded').includes('Đợi một lát'));
check('Supabase tắt đăng ký', viError('Signups not allowed for this instance').includes('Authentication'));
check('Lỗi lạ thì giữ nguyên để không giấu thông tin', viError('Something odd happened') === 'Something odd happened');
check('Không phân biệt hoa thường', viError('INVALID LOGIN CREDENTIALS').includes('không đúng'));

console.log('\n── Điều kiện cho bấm nút ──');
const ready = (email: string, pw: string) => email.trim().length > 3 && pw.length >= 6;
check('Đủ email và mật khẩu 6 ký tự', ready('a@b.com', '123456'));
check('Mật khẩu 5 ký tự thì chặn', !ready('a@b.com', '12345'));
check('Email trống thì chặn', !ready('   ', '123456'));

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

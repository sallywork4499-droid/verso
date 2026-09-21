'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Mascot from '@/components/Mascot';

type Mode = 'in' | 'up';

/** Đổi thông báo lỗi của Supabase sang tiếng Việt dễ hiểu. */
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

export default function Login() {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(viError(error.message));
        setBusy(false);
        return;
      }
      // Supabase bật xác nhận email thì chưa có phiên đăng nhập ngay
      if (!data.session) {
        setNotice('Đã tạo tài khoản. Mở email để xác nhận rồi quay lại đăng nhập.');
        setMode('in');
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(viError(error.message));
        setBusy(false);
        return;
      }
    }

    router.push('/');
    router.refresh();
  }

  const ready = email.trim().length > 3 && password.length >= 6;

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="pop flex justify-center">
          <Mascot size={124} />
        </div>
        <h1 className="mt-5 text-center text-4xl font-bold text-ink">Verso</h1>
        <p className="mt-2.5 text-center leading-relaxed text-muted">
          Dịch ngược Việt sang Anh trên chính tài liệu bạn đang học.
        </p>

        <div className="mt-8 flex gap-1 rounded-2xl bg-sand p-1">
          {(['in', 'up'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
              }}
              aria-pressed={mode === m}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'in' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cua-ban.com"
            autoComplete="email"
            className="w-full rounded-2xl bg-card px-4 py-3.5 text-ink shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
          />

          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu, từ 6 ký tự"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              className="w-full rounded-2xl bg-card py-3.5 pl-4 pr-20 text-ink shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
            >
              {show ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          <button
            type="submit"
            disabled={!ready || busy}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-35 disabled:shadow-none"
          >
            {busy ? 'Đang xử lý…' : mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>

          {error && <p className="text-sm leading-relaxed text-rose">{error}</p>}
          {notice && <p className="text-sm leading-relaxed text-brandDeep">{notice}</p>}
        </form>

        {mode === 'in' && (
          <Link
            href="/reset"
            className="mt-4 block text-center text-sm font-semibold text-brandDeep"
          >
            Quên mật khẩu?
          </Link>
        )}

        <p className="mt-7 text-sm leading-relaxed text-muted">
          {mode === 'in'
            ? 'Lần đầu dùng thì bấm Tạo tài khoản ở trên.'
            : 'Mật khẩu từ 6 ký tự. Phiên đăng nhập giữ lâu để mở app là vào việc ngay.'}
        </p>
      </div>
    </main>
  );
}

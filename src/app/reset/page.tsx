'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Mascot from '@/components/Mascot';

type Stage = 'ask' | 'sent' | 'set' | 'done';

export default function Reset() {
  const [stage, setStage] = useState<Stage>('ask');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Mở từ liên kết trong email: Supabase đã tạo phiên tạm, cho đặt mật khẩu mới
  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('set');
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && location.hash.includes('type=recovery')) setStage('set');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset`,
    });
    setBusy(false);
    if (error) setError('Không gửi được. Kiểm tra lại địa chỉ email.');
    else setStage('sent');
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes('at least')
          ? 'Mật khẩu phải từ 6 ký tự trở lên.'
          : error.message
      );
      return;
    }
    setStage('done');
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center">
          <Mascot size={104} mood={stage === 'done' ? 'cheer' : 'happy'} />
        </div>

        {stage === 'ask' && (
          <>
            <h1 className="mt-5 text-center text-2xl font-bold">Quên mật khẩu</h1>
            <p className="mt-2 text-center leading-relaxed text-muted">
              Nhập email đã đăng ký, app gửi cho bạn một liên kết để đặt lại.
            </p>
            <form onSubmit={sendLink} className="mt-7 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="email@cua-ban.com"
                autoComplete="email"
                className="w-full rounded-2xl bg-card px-4 py-3.5 shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
              />
              <button
                type="submit"
                disabled={busy || email.trim().length < 4}
                className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-35 disabled:shadow-none"
              >
                {busy ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
              </button>
            </form>
          </>
        )}

        {stage === 'sent' && (
          <>
            <h1 className="mt-5 text-center text-2xl font-bold">Đã gửi</h1>
            <p className="mt-3 text-center leading-relaxed text-muted">
              Mở email và bấm vào liên kết để đặt mật khẩu mới. Nhớ xem cả hộp thư rác.
            </p>
          </>
        )}

        {stage === 'set' && (
          <>
            <h1 className="mt-5 text-center text-2xl font-bold">Đặt mật khẩu mới</h1>
            <form onSubmit={savePassword} className="mt-7 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="Mật khẩu mới, từ 6 ký tự"
                autoComplete="new-password"
                className="w-full rounded-2xl bg-card px-4 py-3.5 shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
              />
              <button
                type="submit"
                disabled={busy || password.length < 6}
                className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-35 disabled:shadow-none"
              >
                {busy ? 'Đang lưu…' : 'Lưu mật khẩu'}
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <p className="mt-5 text-center text-lg font-semibold text-brandDeep">
            Xong. Đang vào app…
          </p>
        )}

        {error && <p className="mt-4 text-sm leading-relaxed text-rose">{error}</p>}

        <Link
          href="/login"
          className="mt-8 block text-center text-sm font-semibold text-muted hover:text-ink"
        >
          ← Về trang đăng nhập
        </Link>
      </div>
    </main>
  );
}

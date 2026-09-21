'use client';

import { useEffect } from 'react';

/** Chặn lỗi render, để một chỗ hỏng không làm trắng cả app. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Verso]', error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center">
      <h1 className="text-2xl font-bold">Có gì đó trục trặc</h1>
      <p className="max-w-xs leading-relaxed text-muted">
        Một phần của app vừa lỗi. Thử lại thường là xong.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-2xl bg-brand px-6 py-3 font-semibold text-onBrand shadow-brand"
        >
          Thử lại
        </button>
        <a
          href="/"
          className="rounded-2xl bg-card px-6 py-3 font-semibold text-muted shadow-card"
        >
          Về màn hình luyện
        </a>
      </div>
      {error.digest && <p className="text-xs text-muted">Mã lỗi: {error.digest}</p>}
    </main>
  );
}

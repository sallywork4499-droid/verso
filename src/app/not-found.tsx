import Link from 'next/link';
import Mascot from '@/components/Mascot';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center">
      <Mascot size={110} mood="sleepy" />
      <h1 className="text-2xl font-bold">Không có trang này</h1>
      <Link
        href="/"
        className="rounded-2xl bg-brand px-6 py-3 font-semibold text-onBrand shadow-brand"
      >
        Về màn hình luyện
      </Link>
    </main>
  );
}

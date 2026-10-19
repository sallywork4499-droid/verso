'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Dọn sạch mọi thứ app để lại trên máy. */
async function wipeLocal() {
  try {
    // Hàng đợi, bản nháp, tiến độ theo ngày, lựa chọn giao diện
    Object.keys(localStorage)
      .filter((k) => k.startsWith('verso:'))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    /* trình duyệt chặn lưu trữ thì cũng chẳng có gì để xoá */
  }
  try {
    // Service worker giữ bản trang đã tải, trong đó có nội dung của tài khoản cũ
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* xoá không được thì thôi, không chặn việc đăng xuất */
  }
}

export default function SignOut() {
  const router = useRouter();

  async function out() {
    if (!confirm('Đăng xuất khỏi thiết bị này?')) return;
    await wipeLocal();
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={out} className="text-sm font-semibold text-muted hover:text-rose">
      Đăng xuất
    </button>
  );
}

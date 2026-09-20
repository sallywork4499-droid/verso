'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOut() {
  const router = useRouter();

  async function out() {
    if (!confirm('Đăng xuất khỏi thiết bị này?')) return;
    localStorage.removeItem('verso:queue');
    localStorage.removeItem('verso:draft');
    sessionStorage.clear();
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={out} className="text-sm text-muted hover:text-rose">
      Đăng xuất
    </button>
  );
}

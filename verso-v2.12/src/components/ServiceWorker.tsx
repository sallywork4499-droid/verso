'use client';

import { useEffect } from 'react';

/** Đăng ký service worker để mở app lúc mất mạng vẫn dùng được. */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const id = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* không đăng ký được thì app vẫn chạy bình thường */
      });
    }, 1500); // đợi trang vẽ xong đã, đừng giành băng thông lúc đầu
    return () => clearTimeout(id);
  }, []);

  return null;
}

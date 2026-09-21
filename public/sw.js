/*
 * Service worker tối giản cho Verso.
 * Mục đích duy nhất: mở app lúc mất mạng vẫn thấy màn hình luyện
 * thay vì trang lỗi của trình duyệt. Hàng đợi câu đã nằm sẵn trong localStorage.
 */
const CACHE = 'verso-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Dữ liệu và xác thực luôn phải lấy mới, không được trả bản cũ
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Trang: ưu tiên mạng, mất mạng thì lấy bản đã lưu
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match('/')))
    );
    return;
  }

  // Tài nguyên tĩnh: lấy bản đã lưu trước cho nhanh
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && (url.pathname.startsWith('/_next/') || SHELL.includes(url.pathname))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});

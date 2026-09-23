'use client';

import { useEffect } from 'react';

/**
 * Đo phần màn hình còn nhìn thấy được và ghi vào hai biến CSS.
 *
 * Vì sao cần: đơn vị 100dvh tính theo cả màn hình. Safari trên iPhone không co
 * con số đó lại khi bàn phím hiện ra, nó chỉ đẩy trang lên, nên phần dưới của
 * bố cục nằm khuất sau bàn phím. visualViewport cho biết đúng vùng còn thấy.
 *
 * --app-h   chiều cao vùng còn thấy
 * --app-top vùng đó bắt đầu từ đâu, khi trình duyệt đã đẩy trang lên
 */
export default function useViewportFit() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) {
      // Trình duyệt cũ không có visualViewport: dùng chiều cao cửa sổ
      const fallback = () => root.style.setProperty('--app-h', `${window.innerHeight}px`);
      fallback();
      window.addEventListener('resize', fallback);
      return () => {
        window.removeEventListener('resize', fallback);
        root.style.removeProperty('--app-h');
      };
    }

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--app-h', `${vv.height}px`);
        root.style.setProperty('--app-top', `${vv.offsetTop}px`);
      });
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      root.style.removeProperty('--app-h');
      root.style.removeProperty('--app-top');
    };
  }, []);
}

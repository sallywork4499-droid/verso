'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Đo phần màn hình còn nhìn thấy được, ghi vào biến CSS, và cho biết
 * bàn phím đang mở hay đóng.
 *
 * Vì sao cần: đơn vị 100dvh tính theo cả màn hình. Safari trên iPhone không co
 * con số đó lại khi bàn phím hiện ra, nó chỉ đẩy trang lên, nên phần dưới của
 * bố cục nằm khuất sau bàn phím. visualViewport cho biết đúng vùng còn thấy.
 *
 * --app-h   chiều cao vùng còn thấy
 * --app-top vùng đó bắt đầu từ đâu, khi trình duyệt đã đẩy trang lên
 */
export default function useViewportFit() {
  const [height, setHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Chiều cao lớn nhất từng thấy, coi như lúc chưa có bàn phím
  const baseline = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    if (!vv) {
      // Trình duyệt cũ không có visualViewport: dùng chiều cao cửa sổ
      const fallback = () => {
        root.style.setProperty('--app-h', `${window.innerHeight}px`);
        setHeight(window.innerHeight);
      };
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
        const h = vv.height;
        root.style.setProperty('--app-h', `${h}px`);
        root.style.setProperty('--app-top', `${vv.offsetTop}px`);
        baseline.current = Math.max(baseline.current, h);
        setHeight(h);
        // Bàn phím chiếm chỗ đáng kể mới tính là đang mở
        setKeyboardOpen(baseline.current > 0 && h < baseline.current * 0.78);
      });
    };

    // Xoay ngang dọc thì mốc cũ không còn đúng, đo lại từ đầu
    const resetBaseline = () => {
      baseline.current = 0;
      apply();
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', resetBaseline);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', resetBaseline);
      root.style.removeProperty('--app-h');
      root.style.removeProperty('--app-top');
    };
  }, []);

  return { height, keyboardOpen };
}

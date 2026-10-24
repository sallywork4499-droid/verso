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

    // App mở từ biểu tượng trên màn hình chính của iPhone (chỉ iOS có navigator.standalone)
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const raw = vv.height;
        baseline.current = Math.max(baseline.current, raw);
        // Bàn phím chiếm chỗ đáng kể mới tính là đang mở
        const open = baseline.current > 0 && raw < baseline.current * 0.78;
        const h = open ? raw : fullHeight(raw, iosStandalone);
        root.style.setProperty('--app-h', `${h}px`);
        root.style.setProperty('--app-top', `${vv.offsetTop}px`);
        setHeight(h);
        setKeyboardOpen(open);
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

/**
 * Chiều cao dùng khi bàn phím đóng.
 *
 * Trên iPhone đời mới (iOS 26, ví dụ iPhone 17 Pro), app mở từ màn hình chính
 * được vẽ tràn lên dưới thanh trạng thái, nhưng visualViewport lại báo chiều cao
 * đã trừ phần thanh trạng thái. Kết quả là khung app hụt một dải ở đáy.
 * Khi đó app chiếm trọn màn hình, nên lấy luôn chiều cao màn hình.
 */
export function fullHeight(raw: number, iosStandalone: boolean): number {
  if (!iosStandalone || typeof screen === 'undefined') return raw;
  // iOS không đổi screen.width/height khi xoay máy, tự chọn cạnh theo hướng hiện tại
  const portrait = window.innerHeight >= window.innerWidth;
  const long = Math.max(screen.width, screen.height);
  const short = Math.min(screen.width, screen.height);
  const screenH = portrait ? long : short;
  // Chỉ bù khi phần hụt cỡ một thanh trạng thái, tránh làm sai ở trường hợp lạ
  const gap = screenH - raw;
  return gap > 0 && gap <= 120 ? screenH : raw;
}

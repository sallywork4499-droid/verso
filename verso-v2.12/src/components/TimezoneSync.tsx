'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Ghi múi giờ thật của máy vào hồ sơ.
 * Không có bước này thì mọi người dùng đều bị tính ngày theo giờ Việt Nam,
 * khiến streak và lịch lệch một ngày với ai ở múi giờ khác.
 * Chỉ ghi khi khác với giá trị đang lưu, nên hầu như không tốn gì.
 */
export default function TimezoneSync({
  userId,
  current,
}: {
  userId: string;
  current: string;
}) {
  useEffect(() => {
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
      return;
    }
    if (!tz || tz === current) return;

    createClient().from('profiles').update({ timezone: tz }).eq('id', userId).then(
      () => {},
      () => {
        /* ghi hỏng cũng không chặn việc học */
      }
    );
  }, [userId, current]);

  return null;
}

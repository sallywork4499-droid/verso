'use client';

import { useState } from 'react';
import { DIFFICULTY_LABEL } from '@/lib/scoring';
import type { Card } from '@/lib/types';

/**
 * Những câu hay sai nhất. Dữ liệu vốn đã ghi trong bảng cards
 * nhưng trước nay chưa dùng vào việc gì.
 */
export default function WeakCards({ cards }: { cards: Card[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted shadow-card">
        Chưa có câu nào sai quá hai lần. Cứ luyện tiếp, chỗ này sẽ gom lại những câu bạn hay vấp.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {cards.map((c) => {
        const wrong = c.times_seen - c.times_correct;
        const rate = c.times_seen > 0 ? Math.round((c.times_correct / c.times_seen) * 100) : 0;
        return (
          <li key={c.id} className="rounded-2xl bg-card p-4 shadow-card">
            <button
              onClick={() => setOpen(open === c.id ? null : c.id)}
              className="w-full text-left"
            >
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-sand px-2 py-0.5 font-semibold">
                  {DIFFICULTY_LABEL[c.difficulty]}
                </span>
                <span className="font-semibold text-rose">sai {wrong} lần</span>
                <span>· đúng {rate}%</span>
              </div>
              <p className="leading-relaxed">{c.vi_text}</p>
              {open === c.id && (
                <p className="reveal mt-2 border-t border-line pt-2 leading-relaxed text-brandDeep">
                  {c.en_text}
                </p>
              )}
              {open !== c.id && <p className="mt-1 text-xs text-muted">Chạm để xem bản gốc</p>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

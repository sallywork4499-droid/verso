'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type PageLite = {
  id: string;
  title: string;
  is_default: boolean;
  card_count: number;
  created_at: string;
};

/**
 * Hộp chọn những đoạn muốn luyện.
 * Ít thao tác nhất có thể: mỗi đoạn có nút "Chỉ đoạn này" để vào luyện
 * bằng một lần bấm, còn muốn trộn nhiều đoạn thì tick rồi bấm Luyện.
 */
export default function PassagePicker({
  pages,
  onApply,
  onClose,
}: {
  pages: PageLite[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(pages.filter((p) => p.is_default).map((p) => p.id))
  );
  const [q, setQ] = useState('');

  // Đoạn mới nạp nằm trên cùng, vì đó thường là đoạn đang học
  const sorted = useMemo(
    () => [...pages].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [pages]
  );
  const needle = q.trim().toLowerCase();
  const shown = needle ? sorted.filter((p) => p.title.toLowerCase().includes(needle)) : sorted;

  function toggle(id: string) {
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = picked.size;
  const cards = pages.filter((p) => picked.has(p.id)).reduce((s, p) => s + p.card_count, 0);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="reveal flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">Chọn đoạn để luyện</p>
            <button onClick={onClose} className="px-2 text-sm font-semibold text-muted hover:text-ink">
              Đóng
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Bấm "Chỉ đoạn này" để vào luyện ngay. Muốn trộn nhiều đoạn thì tick rồi bấm Luyện.
          </p>

          {pages.length > 6 && (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm đoạn…"
              className="mt-3 w-full rounded-2xl bg-sand px-4 py-2.5 placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
            />
          )}

          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <button
              onClick={() => setPicked(new Set(pages.map((p) => p.id)))}
              className="rounded-full bg-sand px-3 py-1.5 text-muted hover:text-ink"
            >
              Chọn tất cả
            </button>
            <button
              onClick={() => setPicked(new Set())}
              className="rounded-full bg-sand px-3 py-1.5 text-muted hover:text-ink"
            >
              Bỏ hết
            </button>
          </div>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto px-5 pb-3">
          {shown.length === 0 && (
            <li className="py-6 text-center text-sm text-muted">Không có đoạn nào khớp.</li>
          )}
          {shown.map((p) => {
            const on = picked.has(p.id);
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${
                  on ? 'bg-brand/10' : 'bg-sand'
                }`}
              >
                <button
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  aria-label={on ? `Bỏ chọn ${p.title}` : `Chọn ${p.title}`}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold ${
                      on ? 'border-brand bg-brand text-onBrand' : 'border-line bg-card'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.title}</span>
                    <span className="text-xs text-muted">{p.card_count} mục</span>
                  </span>
                </button>
                <button
                  onClick={() => onApply([p.id])}
                  className="shrink-0 rounded-xl bg-card px-3 py-1.5 text-xs font-semibold text-brandDeep shadow-card"
                >
                  Chỉ đoạn này
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line px-5 pb-5 pt-3">
          {pages.length === 0 ? (
            <Link
              href="/library/new"
              className="block w-full rounded-2xl bg-brand py-3.5 text-center font-semibold text-onBrand shadow-brand"
            >
              Nạp đoạn đầu tiên
            </Link>
          ) : (
            <button
              onClick={() => onApply(Array.from(picked))}
              disabled={count === 0}
              className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-35 disabled:shadow-none"
            >
              {count === 0 ? 'Chọn ít nhất một đoạn' : `Luyện ${count} đoạn · ${cards} mục`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

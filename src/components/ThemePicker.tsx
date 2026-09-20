'use client';

import { useEffect, useState } from 'react';

export type Theme = 'auto' | 'light' | 'dark';
const KEY = 'verso:theme';
const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Tự động' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  // Đổi luôn màu thanh trạng thái của trình duyệt cho khớp
  const dark =
    theme === 'dark' ||
    (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#1C1614' : '#FFF6F0');
}

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    setTheme(((localStorage.getItem(KEY) as Theme) ?? 'auto') || 'auto');
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  return (
    <div className="flex gap-1 rounded-2xl bg-sand p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            theme === o.value ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

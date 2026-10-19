'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CHOICES = [5, 10, 20, 30];

/** Đặt số câu mục tiêu mỗi ngày. Lưu thẳng vào hồ sơ. */
export default function GoalPicker({ userId, goal }: { userId: string; goal: number }) {
  const [value, setValue] = useState(goal);
  const [saving, setSaving] = useState(false);

  async function choose(next: number) {
    setValue(next);
    setSaving(true);
    await createClient().from('profiles').update({ daily_goal: next }).eq('id', userId);
    setSaving(false);
  }

  return (
    <div>
      <div className="flex gap-1 rounded-2xl bg-sand p-1">
        {CHOICES.map((n) => (
          <button
            key={n}
            onClick={() => choose(n)}
            aria-pressed={value === n}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              value === n ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
            }`}
          >
            {n} câu
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {saving ? 'Đang lưu…' : 'Mục tiêu mỗi ngày. Vòng tròn ở màn hình luyện đếm theo con số này.'}
      </p>
    </div>
  );
}

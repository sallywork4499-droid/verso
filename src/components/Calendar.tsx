'use client';

import { useState } from 'react';
import { dateKey } from '@/lib/session';

type Log = { log_date: string; cards_completed: number };
type View = 'month' | 'year';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const MONTHS_SHORT = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

/** Thứ trong tuần kiểu Việt Nam: thứ Hai là cột đầu. */
const mondayFirst = (jsDay: number) => (jsDay + 6) % 7;

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

/** Đậm nhạt theo số câu đã làm trong ngày. */
function tone(n: number) {
  if (n === 0) return 'bg-sand text-muted';
  if (n < 3) return 'bg-brand/25 text-brandDeep font-semibold';
  if (n < 8) return 'bg-brand/60 text-white font-semibold';
  return 'bg-brand text-white font-bold';
}

export default function Calendar({ logs, timezone }: { logs: Log[]; timezone: string }) {
  const today = dateKey(new Date(), timezone);
  const [ty, tm] = today.split('-').map(Number);

  const [view, setView] = useState<View>('month');
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm - 1);

  const byDate = new Map(logs.map((l) => [l.log_date, l.cards_completed]));
  const countOf = (y: number, m0: number, d: number) => byDate.get(keyOf(y, m0, d)) ?? 0;
  const daysIn = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

  function shiftMonth(step: number) {
    const d = new Date(year, month + step, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const totals = (y: number, m0: number) => {
    let active = 0;
    let cards = 0;
    for (let d = 1; d <= daysIn(y, m0); d++) {
      const n = countOf(y, m0, d);
      if (n > 0) {
        active++;
        cards += n;
      }
    }
    return { active, cards };
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-4 flex gap-1 rounded-2xl bg-sand p-1">
        {(['month', 'year'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`flex-1 rounded-xl py-1.5 text-sm font-semibold transition-colors ${
              view === v ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
            }`}
          >
            {v === 'month' ? 'Tháng' : 'Cả năm'}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => (view === 'month' ? shiftMonth(-1) : setYear((y) => y - 1))}
          aria-label={view === 'month' ? 'Tháng trước' : 'Năm trước'}
          className="h-9 w-9 rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
        >
          ←
        </button>
        <p className="font-semibold">{view === 'month' ? `${MONTHS[month]} ${year}` : `Năm ${year}`}</p>
        <button
          onClick={() => (view === 'month' ? shiftMonth(1) : setYear((y) => y + 1))}
          aria-label={view === 'month' ? 'Tháng sau' : 'Năm sau'}
          className="h-9 w-9 rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
        >
          →
        </button>
      </div>

      {view === 'month' ? (
        <MonthGrid
          year={year}
          month={month}
          today={today}
          countOf={countOf}
          daysIn={daysIn}
        />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {MONTHS_SHORT.map((label, m0) => {
            const t = totals(year, m0);
            return (
              <button
                key={m0}
                onClick={() => {
                  setMonth(m0);
                  setView('month');
                }}
                className={`rounded-xl p-2 text-left transition-colors hover:bg-sand ${
                  year === ty && m0 === tm - 1 ? 'ring-1 ring-brand/50' : ''
                }`}
              >
                <p className="mb-1.5 text-xs font-semibold">{label}</p>
                <MiniMonth year={year} month={m0} today={today} countOf={countOf} daysIn={daysIn} />
                <p className="mt-1.5 text-[10px] text-muted">
                  {t.active > 0 ? `${t.active} ngày` : '—'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-center text-xs text-muted">
        {view === 'month'
          ? (() => {
              const t = totals(year, month);
              return t.active > 0
                ? `Học ${t.active} ngày trong tháng này · ${t.cards} câu`
                : 'Tháng này chưa có ngày nào học';
            })()
          : (() => {
              let a = 0;
              let c = 0;
              for (let m = 0; m < 12; m++) {
                const t = totals(year, m);
                a += t.active;
                c += t.cards;
              }
              return a > 0 ? `Cả năm ${year}: học ${a} ngày · ${c} câu` : `Năm ${year} chưa có dữ liệu`;
            })()}
      </p>
    </div>
  );
}

type GridProps = {
  year: number;
  month: number;
  today: string;
  countOf: (y: number, m0: number, d: number) => number;
  daysIn: (y: number, m0: number) => number;
};

function cellsFor(year: number, month: number, daysIn: GridProps['daysIn']) {
  const lead = mondayFirst(new Date(year, month, 1).getDay());
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysIn(year, month) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MonthGrid({ year, month, today, countOf, daysIn }: GridProps) {
  return (
    <div className="grid grid-cols-7 gap-y-1 text-center">
      {WEEKDAYS.map((w) => (
        <span key={w} className="pb-1 text-xs font-semibold text-muted">
          {w}
        </span>
      ))}
      {cellsFor(year, month, daysIn).map((day, i) => {
        if (day === null) return <span key={`x${i}`} />;
        const k = keyOf(year, month, day);
        const n = countOf(year, month, day);
        return (
          <div key={k} className="flex justify-center py-0.5">
            <div
              title={`${day}/${month + 1}: ${n} câu`}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                k > today ? 'text-muted/40' : tone(n)
              } ${k === today ? 'ring-2 ring-brand ring-offset-2 ring-offset-card' : ''}`}
            >
              {day}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Tháng thu nhỏ trong chế độ xem cả năm: chỉ chấm, không số. */
function MiniMonth({ year, month, today, countOf, daysIn }: GridProps) {
  return (
    <div className="grid grid-cols-7 gap-[2px]">
      {cellsFor(year, month, daysIn).map((day, i) => {
        if (day === null) return <span key={`x${i}`} className="aspect-square" />;
        const n = countOf(year, month, day);
        const k = keyOf(year, month, day);
        const bg =
          k > today
            ? 'bg-transparent'
            : n === 0
              ? 'bg-sand'
              : n < 3
                ? 'bg-brand/30'
                : n < 8
                  ? 'bg-brand/60'
                  : 'bg-brand';
        return (
          <span
            key={k}
            className={`aspect-square rounded-[2px] ${bg} ${
              k === today ? 'ring-1 ring-brand' : ''
            }`}
          />
        );
      })}
    </div>
  );
}

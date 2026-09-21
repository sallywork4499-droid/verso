'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DIFFICULTY_LABEL } from '@/lib/scoring';
import {
  ALL_LEVELS,
  afterCorrect,
  afterWrong,
  dateKey,
  mergeQueue,
  normalizeLevels,
  progressOf,
  selectionKey,
  selectionLabel,
} from '@/lib/session';
import { createClient } from '@/lib/supabase/client';
import Mascot from '@/components/Mascot';
import PassagePicker, { type PageLite } from '@/components/PassagePicker';
import {
  BadgeToast,
  Centered,
  FixSheet,
  GoalToast,
  Review,
  StatusBar,
} from '@/components/PracticeParts';
import type { Card, Difficulty, Feedback, Profile } from '@/lib/types';

const DRAFT_KEY = 'verso:draft';
const CACHE_KEY = 'verso:queue';
const OPEN_KEY = 'verso:opened';
const LOW_WATER = 3; // còn ít hơn chừng này câu thì nạp thêm

type Phase = 'writing' | 'revealed';

/** Nơi lưu danh sách câu đã đúng, theo từng ngày và từng lựa chọn. */
const doneStoreKey = (day: string, key: string) => `verso:done:${day}:${key}`;

function loadDone(day: string, key: string): Set<string> {
  try {
    const raw = localStorage.getItem(doneStoreKey(day, key));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDone(day: string, key: string, done: Set<string>) {
  try {
    localStorage.setItem(doneStoreKey(day, key), JSON.stringify(Array.from(done)));
  } catch {
    /* hết chỗ lưu thì thôi, chỉ mất tiến độ hiển thị */
  }
}

export default function Practice({
  profile,
  doneToday: initialDone,
  pages: initialPages,
}: {
  profile: Profile;
  doneToday: number;
  pages: PageLite[];
}) {
  /* ---------- lựa chọn: đoạn nào, mức nào ---------- */
  const [pages, setPages] = useState<PageLite[]>(initialPages);
  const [levels, setLevels] = useState<Difficulty[]>(normalizeLevels(profile.focus_levels));
  const [picking, setPicking] = useState(false);
  const [applying, setApplying] = useState(false);

  const selected = useMemo(() => pages.filter((p) => p.is_default), [pages]);
  const selKey = useMemo(
    () => selectionKey(selected.map((p) => p.id), levels),
    [selected, levels]
  );
  const today = dateKey(new Date(), profile.timezone);

  /* ---------- hàng đợi và tiến độ ---------- */
  const [queue, setQueue] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);

  /* ---------- điểm và thưởng ---------- */
  const [doneThisSession, setDoneThisSession] = useState(0);
  const [doneToday, setDoneToday] = useState(initialDone);
  const [goalHit, setGoalHit] = useState(false);
  const [combo, setCombo] = useState(0);
  const [points, setPoints] = useState(profile.total_points);
  const [streak, setStreak] = useState(profile.current_streak);
  const [gained, setGained] = useState<number | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  /* ---------- một câu đang làm ---------- */
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixVi, setFixVi] = useState('');
  const [fixEn, setFixEn] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const dirty = useRef(false); // có câu vừa chấm thì trang Tiến độ đang giữ đã cũ
  const retried = useRef<Set<string>>(new Set()); // câu đã từng sai trong lựa chọn này
  const queueRef = useRef<Card[]>([]);
  const doneRef = useRef<Set<string>>(new Set());
  const keyRef = useRef(selKey); // lựa chọn mà lời gọi mạng đang phục vụ

  const card = queue[0] ?? null;
  const firstTry = card ? !retried.current.has(card.id) : true;
  const prog = progressOf(done, total);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  /* ---------- nạp câu ---------- */
  const refill = useCallback(
    async (mode: 'replace' | 'append') => {
      const forKey = keyRef.current;
      if (mode === 'replace' && queueRef.current.length === 0) setLoading(true);
      try {
        const exclude = [
          ...(mode === 'append' ? queueRef.current.map((c) => c.id) : []),
          ...Array.from(doneRef.current),
        ];
        const res = await fetch('/api/next-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ levels, exclude }),
        });
        const data = await res.json();

        // Người dùng đã đổi lựa chọn trong lúc chờ: bỏ kết quả cũ, không để lẫn vào
        if (keyRef.current !== forKey) return;

        const incoming: Card[] = data.cards ?? [];
        setTotal(typeof data.total === 'number' ? data.total : 0);
        setQueue((cur) => (mode === 'replace' ? incoming : mergeQueue(cur, incoming)));
        if (mode === 'replace') setEmptyReason(incoming.length === 0 ? data.reason : null);
      } catch {
        if (keyRef.current === forKey && queueRef.current.length === 0) setEmptyReason('offline');
      } finally {
        if (keyRef.current === forKey) setLoading(false);
      }
    },
    [levels]
  );

  /**
   * Đổi lựa chọn: xoá sạch mọi thứ của lựa chọn cũ rồi nạp mới.
   * Đây là chỗ đảm bảo đổi đoạn thì không dính câu, cụm của đoạn cũ.
   */
  useEffect(() => {
    keyRef.current = selKey;
    retried.current = new Set();
    const restored = loadDone(today, selKey);
    doneRef.current = restored;
    setDone(restored);
    setCombo(0);
    setAnswer('');
    setPhase('writing');
    setFeedback(null);
    setGradeError(null);

    // Hàng đợi lưu trên máy chỉ dùng lại khi đúng lựa chọn này
    let fromCache: Card[] = [];
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cached = raw ? (JSON.parse(raw) as { key: string; cards: Card[] }) : null;
      if (cached?.key === selKey && cached.cards?.length) {
        fromCache = cached.cards.filter((c) => !restored.has(c.id));
      }
    } catch {
      /* cache hỏng thì bỏ qua */
    }
    queueRef.current = fromCache;
    setQueue(fromCache);
    setLoading(fromCache.length === 0);

    refill('replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  // Ghi hàng đợi xuống máy để mở app là có câu ngay
  useEffect(() => {
    if (!queue.length) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ key: selKey, cards: queue.slice(0, 20) }));
    } catch {
      /* hết chỗ lưu thì bỏ qua */
    }
  }, [queue, selKey]);

  /* ---------- đổi lựa chọn ---------- */
  async function applySelection(ids: string[]) {
    setPicking(false);
    const want = new Set(ids);
    const unchanged =
      selected.length === want.size && selected.every((p) => want.has(p.id));
    if (unchanged) return;

    // Ghi xuống database trước, vì server bốc câu dựa theo lựa chọn đã lưu
    setApplying(true);
    const supabase = createClient();
    const on = ids;
    const off = pages.filter((p) => !want.has(p.id)).map((p) => p.id);
    await Promise.all([
      on.length ? supabase.from('pages').update({ is_default: true }).in('id', on) : null,
      off.length ? supabase.from('pages').update({ is_default: false }).in('id', off) : null,
    ]);
    setPages((cur) => cur.map((p) => ({ ...p, is_default: want.has(p.id) })));
    setApplying(false);
  }

  function toggleLevel(l: Difficulty) {
    const has = levels.includes(l);
    if (has && levels.length === 1) return; // luôn còn ít nhất một mức
    const next = normalizeLevels(has ? levels.filter((x) => x !== l) : [...levels, l]);
    setLevels(next);
    createClient().from('profiles').update({ focus_levels: next }).eq('id', profile.id).then(
      () => {},
      () => {}
    );
  }

  function restartSelection() {
    const empty = new Set<string>();
    saveDone(today, selKey, empty);
    doneRef.current = empty;
    setDone(empty);
    retried.current = new Set();
    refill('replace');
  }

  /** Đoạn nạp ngay sau đoạn đang học, để gợi ý "sang đoạn tiếp". */
  const nextPage = useMemo(() => {
    if (selected.length !== 1) return null;
    const ordered = [...pages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const i = ordered.findIndex((p) => p.id === selected[0].id);
    return i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;
  }, [pages, selected]);

  /* ---------- bản nháp: đóng app mở lại không mất ---------- */
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const { cardId, text } = JSON.parse(saved);
      if (cardId === card?.id) setAnswer(text);
    } catch {
      /* nháp hỏng thì bỏ qua */
    }
  }, [card?.id]);

  useEffect(() => {
    if (card && phase === 'writing') {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ cardId: card.id, text: answer }));
    }
  }, [answer, card, phase]);

  /* ---------- đo thời gian và số lần mở app ---------- */
  useEffect(() => {
    // Chuyển qua lại giữa các trang trong app không tính là một lần mở mới
    if (!sessionStorage.getItem(OPEN_KEY)) {
      sessionStorage.setItem(OPEN_KEY, '1');
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: 0, isOpen: true }),
      }).catch(() => {});
    }

    let active = Date.now();
    const flush = () => {
      const secs = Math.round((Date.now() - active) / 1000);
      active = Date.now();
      if (secs > 2) {
        navigator.sendBeacon?.(
          '/api/heartbeat',
          new Blob([JSON.stringify({ seconds: secs })], { type: 'application/json' })
        );
      }
    };
    const onHide = () => document.visibilityState === 'hidden' && flush();
    const timer = setInterval(flush, 60_000);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, []);

  /* ---------- kiểm tra: hiện bản gốc ngay, chấm chạy nền ---------- */
  function check() {
    if (!card || !answer.trim()) return;
    setPhase('revealed');
    inputRef.current?.blur();
    runGrade();
  }

  /** Gọi chấm bài chạy nền. Tách riêng để nút Chấm lại dùng được. */
  function runGrade() {
    if (!card) return;
    setGrading(true);
    setGradeError(null);
    fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vi: card.vi_text, en: card.en_text, answer }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error ?? 'Chưa chấm được lúc này');
        return d as Feedback;
      })
      .then(setFeedback)
      .catch((e) => setGradeError(e instanceof Error ? e.message : 'Chưa chấm được lúc này'))
      .finally(() => setGrading(false));
  }

  /* ---------- người dùng tự phán đúng/sai ---------- */
  async function judge(correct: boolean) {
    if (!card) return;
    const nextCombo = correct ? combo + 1 : 0;

    const res = await fetch('/api/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: card.id,
        answer,
        isCorrect: correct,
        firstTry,
        comboCount: nextCombo, // tính cả câu đang chấm
        feedback,
      }),
    })
      .then((r) => r.json())
      .catch(() => null);

    if (res?.profile) {
      setPoints(res.profile.total_points);
      setStreak(res.profile.current_streak);
    }
    if (typeof res?.doneToday === 'number') {
      const before = doneToday;
      setDoneToday(res.doneToday);
      // Chỉ ăn mừng đúng lúc vừa chạm mốc, không lặp lại mỗi câu sau đó
      if (before < profile.daily_goal && res.doneToday >= profile.daily_goal) {
        setGoalHit(true);
        setTimeout(() => setGoalHit(false), 3600);
      }
    }
    if (correct && res?.points) {
      setGained(res.points);
      setTimeout(() => setGained(null), 1400);
    }
    if (res?.newBadges?.length) {
      setBadge(res.newBadges[0]);
      setTimeout(() => setBadge(null), 3500);
    }

    setCombo(nextCombo);
    dirty.current = true;
    localStorage.removeItem(DRAFT_KEY);

    if (correct) {
      retried.current.delete(card.id);
      setDoneThisSession((n) => n + 1);
      const nextDone = new Set(doneRef.current).add(card.id);
      doneRef.current = nextDone;
      setDone(nextDone);
      saveDone(today, selKey, nextDone);
      advance(afterCorrect(queue));
    } else {
      // Câu sai quay lại sau vài câu khác, lặp đến khi dịch đúng
      retried.current.add(card.id);
      advance(afterWrong(queue));
    }
  }

  function advance(next: Card[]) {
    setAnswer('');
    setPhase('writing');
    setFeedback(null);
    setGradeError(null);
    queueRef.current = next;
    setQueue(next);
    if (next.length < LOW_WATER) refill('append');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openFix() {
    if (!card) return;
    setFixVi(card.vi_text);
    setFixEn(card.en_text);
    setFixing(true);
  }

  /** Lưu sửa đổi, cập nhật luôn câu đang hiện để khỏi phải tải lại. */
  async function saveFix() {
    if (!card) return;
    const vi = fixVi.trim();
    const en = fixEn.trim();
    if (!vi || !en) return;
    setQueue((cur) => cur.map((c) => (c.id === card.id ? { ...c, vi_text: vi, en_text: en } : c)));
    setFixing(false);
    dirty.current = true;
    await createClient().from('cards').update({ vi_text: vi, en_text: en }).eq('id', card.id);
  }

  /** Bỏ hẳn câu hỏng khỏi kho. */
  async function dropCard() {
    if (!card) return;
    if (!confirm('Xoá hẳn câu này khỏi thư viện?')) return;
    const id = card.id;
    setFixing(false);
    dirty.current = true;
    setTotal((t) => Math.max(0, t - 1));
    advance(queue.filter((c) => c.id !== id));
    await createClient().from('cards').delete().eq('id', id);
  }

  function retry() {
    if (card) retried.current.add(card.id);
    setPhase('writing');
    setFeedback(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /* ---------- giao diện ---------- */
  const finished = !loading && !card && prog.finished;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <StatusBar
        streak={streak}
        points={points}
        gained={gained}
        done={doneThisSession}
        doneToday={doneToday}
        goal={profile.daily_goal}
        onOpenDashboard={(e) => {
          if (!dirty.current) return; // chưa đổi gì: dùng bản đang giữ, hiện ngay
          e.preventDefault();
          dirty.current = false;
          router.refresh(); // xoá bản cũ trong bộ nhớ trước khi sang
          router.push('/dashboard');
        }}
      />

      {/* Đang luyện đoạn nào, và tiến độ của lựa chọn đó */}
      <div className="flex items-center gap-3 px-4 pt-2">
        <button
          onClick={() => setPicking(true)}
          disabled={applying}
          className="flex min-w-0 items-center gap-2 rounded-2xl bg-card px-3.5 py-2 shadow-card disabled:opacity-50"
        >
          <span aria-hidden>📖</span>
          <span className="truncate text-sm font-semibold">
            {applying ? 'Đang đổi…' : selectionLabel(selected, pages.length)}
          </span>
          <span className="text-xs text-muted" aria-hidden>
            ▾
          </span>
        </button>
        {total > 0 && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted">
              {prog.done}/{prog.total}
            </span>
          </div>
        )}
      </div>

      {/* Mức: bật tắt tự do, chọn nhiều được */}
      <div className="flex gap-1.5 px-4 pb-3 pt-3">
        {ALL_LEVELS.map((l) => {
          const on = levels.includes(l);
          return (
            <button
              key={l}
              onClick={() => toggleLevel(l)}
              aria-pressed={on}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                on ? 'bg-card text-brand shadow-card' : 'bg-sand/60 text-muted hover:text-ink'
              }`}
            >
              {DIFFICULTY_LABEL[l]}
            </button>
          );
        })}
      </div>

      <main className="flex flex-1 flex-col px-4 pb-4">
        {loading ? (
          <Centered>Đang lấy câu…</Centered>
        ) : finished ? (
          <FinishedState
            total={prog.total}
            nextTitle={nextPage?.title ?? null}
            onNext={nextPage ? () => applySelection([nextPage.id]) : null}
            onRestart={restartSelection}
            onPick={() => setPicking(true)}
          />
        ) : !card ? (
          <EmptyState reason={emptyReason} levels={levels} onPick={() => setPicking(true)} />
        ) : (
          <>
            <div className="flex flex-1 flex-col justify-center py-4">
              <p
                className={`text-ink ${
                  card.difficulty === 'paragraph' ? 'text-promptSm' : 'text-prompt'
                }`}
              >
                {card.vi_text}
              </p>
              <button
                onClick={openFix}
                className="mt-3 self-start text-xs font-semibold text-muted hover:text-ink"
              >
                Câu này có vấn đề?
              </button>
            </div>

            {phase === 'writing' ? (
              <div className="space-y-3">
                <textarea
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Viết lại bằng tiếng Anh…"
                  rows={card.difficulty === 'paragraph' ? 6 : 3}
                  autoFocus
                  className="w-full resize-none rounded-2xl bg-card p-4 leading-relaxed text-ink shadow-card placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
                />
                <button
                  onClick={check}
                  disabled={!answer.trim()}
                  className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand transition-opacity disabled:opacity-30 disabled:shadow-none"
                >
                  Kiểm tra
                </button>
              </div>
            ) : (
              <Review
                card={card}
                answer={answer}
                feedback={feedback}
                grading={grading}
                gradeError={gradeError}
                onCorrect={() => judge(true)}
                onWrong={() => judge(false)}
                onRetry={retry}
                onRegrade={runGrade}
              />
            )}
          </>
        )}
      </main>

      {picking && (
        <PassagePicker pages={pages} onApply={applySelection} onClose={() => setPicking(false)} />
      )}
      {fixing && card && (
        <FixSheet
          vi={fixVi}
          en={fixEn}
          onVi={setFixVi}
          onEn={setFixEn}
          onSave={saveFix}
          onDrop={dropCard}
          onClose={() => setFixing(false)}
        />
      )}
      {goalHit && <GoalToast goal={profile.daily_goal} />}
      {badge && <BadgeToast badgeKey={badge} />}
    </div>
  );
}

/* ================= trạng thái riêng của học theo đoạn ================= */

function FinishedState({
  total,
  nextTitle,
  onNext,
  onRestart,
  onPick,
}: {
  total: number;
  nextTitle: string | null;
  onNext: (() => void) | null;
  onRestart: () => void;
  onPick: () => void;
}) {
  return (
    <div className="pop flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Mascot size={120} mood="cheer" />
      <div>
        <p className="text-xl font-bold">Xong rồi</p>
        <p className="mt-1 leading-relaxed text-muted">
          Đã dịch đúng cả {total} mục của lựa chọn này.
        </p>
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        {onNext && nextTitle && (
          <button
            onClick={onNext}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand"
          >
            Sang đoạn tiếp: <span className="font-bold">{nextTitle}</span>
          </button>
        )}
        <button
          onClick={onPick}
          className={`w-full rounded-2xl py-3.5 font-semibold ${
            onNext ? 'bg-card text-ink shadow-card' : 'bg-brand text-onBrand shadow-brand'
          }`}
        >
          Chọn đoạn khác
        </button>
        <button onClick={onRestart} className="w-full py-2 text-sm font-semibold text-muted hover:text-ink">
          Luyện lại từ đầu
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  reason,
  levels,
  onPick,
}: {
  reason: string | null;
  levels: Difficulty[];
  onPick: () => void;
}) {
  if (reason === 'offline') {
    return <Centered>Mất mạng rồi. Thử lại khi có sóng nhé.</Centered>;
  }

  if (reason === 'no_selection') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <Mascot size={110} mood="sleepy" />
        <p className="max-w-xs leading-relaxed text-muted">Chưa chọn đoạn nào để luyện.</p>
        <button
          onClick={onPick}
          className="rounded-2xl bg-brand px-6 py-3 font-semibold text-onBrand shadow-brand"
        >
          Chọn đoạn
        </button>
      </div>
    );
  }

  if (reason === 'no_cards_at_level') {
    const names = levels.map((l) => DIFFICULTY_LABEL[l].toLowerCase()).join(', ');
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <Mascot size={110} mood="sleepy" />
        <p className="max-w-xs leading-relaxed text-muted">
          Những đoạn đang chọn chưa có mục nào ở mức {names}. Bật thêm mức khác ở trên, hoặc chọn
          đoạn khác.
        </p>
        <button
          onClick={onPick}
          className="rounded-2xl bg-card px-6 py-3 font-semibold text-ink shadow-card"
        >
          Chọn đoạn khác
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Mascot size={116} mood="sleepy" />
      <p className="max-w-xs leading-relaxed text-muted">
        Chưa có gì để dịch. Nạp đoạn đầu tiên: dán văn bản, danh sách từ, hoặc chụp ảnh tài liệu.
      </p>
      <Link
        href="/library/new"
        className="rounded-2xl bg-brand px-6 py-3 font-semibold text-onBrand shadow-brand"
      >
        Nạp đoạn đầu tiên
      </Link>
    </div>
  );
}

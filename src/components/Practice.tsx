'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DIFFICULTY_LABEL, badgeLabel } from '@/lib/scoring';
import { afterCorrect, afterWrong, mergeQueue } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';
import Mascot from '@/components/Mascot';
import GoalRing from '@/components/GoalRing';
import type { Card, Difficulty, Feedback, Profile } from '@/lib/types';

const ORDER: Difficulty[] = ['phrase', 'sentence', 'paragraph'];
const DRAFT_KEY = 'verso:draft';
const CACHE_KEY = 'verso:queue';
const OPEN_KEY = 'verso:opened';
const LOW_WATER = 3; // còn ít hơn chừng này câu thì nạp thêm

type Phase = 'writing' | 'revealed';

export default function Practice({
  profile,
  doneToday: initialDone,
}: {
  profile: Profile;
  doneToday: number;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(profile.preferred_difficulty);
  const [queue, setQueue] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [doneThisSession, setDoneThisSession] = useState(0);
  const [doneToday, setDoneToday] = useState(initialDone);
  const [goalHit, setGoalHit] = useState(false);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);

  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [combo, setCombo] = useState(0);
  const [points, setPoints] = useState(profile.total_points);
  const [streak, setStreak] = useState(profile.current_streak);
  const [gained, setGained] = useState<number | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixVi, setFixVi] = useState('');
  const [fixEn, setFixEn] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  // Có câu vừa chấm thì trang Tiến độ đang giữ trong bộ nhớ đã cũ
  const dirty = useRef(false);
  // Câu nào đã từng bị đánh sai trong phiên này — theo từng câu, không dùng chung một cờ
  const retried = useRef<Set<string>>(new Set());
  const card = queue[0] ?? null;
  const firstTry = card ? !retried.current.has(card.id) : true;

  /* ---------- nạp câu ---------- */
  const refill = useCallback(
    async (diff: Difficulty, mode: 'replace' | 'append') => {
      if (mode === 'replace' && queueRef.current.length === 0) setLoading(true);
      try {
        const exclude =
          mode === 'append' ? queueRef.current.map((c) => c.id).join(',') : '';
        const res = await fetch(
          `/api/next-card?difficulty=${diff}&exclude=${encodeURIComponent(exclude)}`
        );
        const data = await res.json();
        const incoming: Card[] = data.cards ?? [];
        // Nối vào cuối: hàng đợi có thể đang giữ câu chờ sửa, không được ghi đè
        setQueue((cur) => (mode === 'replace' ? incoming : mergeQueue(cur, incoming)));
        if (mode === 'replace') {
          setEmptyReason(incoming.length === 0 ? data.reason : null);
        }
      } catch {
        // Mất mạng: vẫn học tiếp bằng hàng đợi đã lưu
        if (mode === 'replace' && queueRef.current.length === 0) setEmptyReason('offline');
      } finally {
        if (mode === 'replace') setLoading(false);
      }
    },
    []
  );

  // Bản sao hàng đợi để refill đọc được mà không phải nằm trong dependency
  const queueRef = useRef<Card[]>([]);
  useEffect(() => {
    queueRef.current = queue;
    if (queue.length) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ difficulty, cards: queue.slice(0, 20) }));
      } catch {
        /* hết chỗ lưu thì bỏ qua, không ảnh hưởng việc học */
      }
    }
  }, [queue, difficulty]);

  // Mở app: dựng lại hàng đợi lần trước để có câu ngay, rồi mới hỏi server
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as { difficulty: Difficulty; cards: Card[] };
      if (cached.difficulty === difficulty && cached.cards?.length) {
        setQueue(cached.cards);
        setLoading(false);
      }
    } catch {
      /* cache hỏng thì bỏ qua */
    }
    // chỉ chạy một lần lúc mở app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    retried.current.clear();
    refill(difficulty, 'replace');
  }, [difficulty, refill]);

  /* ---------- bản nháp: đóng app mở lại không mất ---------- */
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const { cardId, text } = JSON.parse(saved);
        if (cardId === card?.id) setAnswer(text);
      } catch {
        /* nháp hỏng thì bỏ qua */
      }
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
    const fresh = !sessionStorage.getItem(OPEN_KEY);
    if (fresh) {
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
    setQueue(next);
    if (next.length < LOW_WATER) refill(difficulty, 'append');
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

      <div className="flex gap-1 px-4 pb-3 pt-1">
        {ORDER.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDifficulty(d);
              setAnswer('');
              setPhase('writing');
              setFeedback(null);
              setCombo(0);
              // Lần mở app sau vào thẳng mức này
              createClient().from('profiles').update({ preferred_difficulty: d }).eq('id', profile.id);
            }}
            className={`flex-1 rounded-xl py-2 text-sm transition-colors ${
              difficulty === d
                ? 'bg-card text-brand shadow-card'
                : 'text-muted hover:text-ink'
            }`}
          >
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>

      <main className="flex flex-1 flex-col px-4 pb-4">
        {loading ? (
          <Centered>Đang lấy câu…</Centered>
        ) : !card ? (
          <EmptyState reason={emptyReason} difficulty={difficulty} />
        ) : (
          <>
            <div className="flex flex-1 items-center py-4">
              <p
                className={`font-study text-ink ${
                  card.difficulty === 'paragraph' ? 'text-promptSm' : 'text-prompt'
                }`}
              >
                {card.vi_text}
              </p>
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
                  className="w-full resize-none rounded-2xl bg-card shadow-card p-4 leading-relaxed text-ink placeholder:text-muted/70 focus:border-brand/60 focus:outline-none"
                />
                <button
                  onClick={check}
                  disabled={!answer.trim()}
                  className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand transition-opacity disabled:opacity-30"
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
              />
            )}
          </>
        )}
      </main>

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

/* ================= các khối phụ ================= */

function StatusBar({
  streak,
  points,
  gained,
  done,
  doneToday,
  goal,
  onOpenDashboard,
}: {
  streak: number;
  points: number;
  gained: number | null;
  done: number;
  doneToday: number;
  goal: number;
  onOpenDashboard: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <header className="flex items-center justify-between px-4 pt-3 text-sm">
      <div className="flex items-center gap-3">
        <GoalRing done={doneToday} goal={goal} />
        <span className="text-brand">🔥 {streak}</span>
        <span className="relative text-muted">
          {points.toLocaleString('vi-VN')}
          {gained !== null && (
            <span className="reveal absolute -right-1 -top-4 text-brand">+{gained}</span>
          )}
        </span>
        {done > 0 && <span className="text-muted/70">{done} câu phiên này</span>}
      </div>
      <nav className="flex gap-4 text-muted">
        <Link href="/library" className="hover:text-ink">
          Thư viện
        </Link>
        <Link href="/dashboard" onClick={onOpenDashboard} className="hover:text-ink">
          Tiến độ
        </Link>
      </nav>
    </header>
  );
}

function Review({
  card,
  answer,
  feedback,
  grading,
  gradeError,
  onCorrect,
  onWrong,
  onRetry,
}: {
  card: Card;
  answer: string;
  feedback: Feedback | null;
  grading: boolean;
  gradeError: string | null;
  onCorrect: () => void;
  onWrong: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="reveal space-y-4">
      <div className="rounded-2xl bg-card shadow-card p-4">
        <p className="mb-1 text-xs text-muted">Bạn viết</p>
        <p className="leading-relaxed text-muted">{answer}</p>
      </div>

      <div className="rounded-2xl border border-lilac/30 bg-lilac/5 p-4">
        <p className="mb-1 text-xs text-lilacText">Bản gốc</p>
        <p className="leading-relaxed text-ink">{card.en_text}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onWrong}
          className="flex-1 rounded-2xl border border-line py-3 text-muted hover:border-rose/50 hover:text-rose"
        >
          Chưa đúng
        </button>
        <button
          onClick={onCorrect}
          className="flex-1 rounded-2xl bg-brand py-3 font-semibold text-onBrand shadow-brand"
        >
          Đúng rồi
        </button>
      </div>

      <button onClick={onRetry} className="w-full py-1 text-sm text-muted hover:text-ink">
        Sửa lại câu này
      </button>

      {grading && <p className="text-center text-sm text-muted">Đang chấm kỹ hơn…</p>}
      {gradeError && (
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm leading-relaxed text-rose">{gradeError}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Bản gốc ở trên vẫn đủ để tự đối chiếu, việc học không bị chặn.
          </p>
        </div>
      )}
      {feedback && <FeedbackCard feedback={feedback} />}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const tone =
    feedback.verdict === 'sát nghĩa'
      ? 'text-lilacText'
      : feedback.verdict === 'lệch nhẹ'
        ? 'text-brand'
        : 'text-rose';

  return (
    <div className="reveal space-y-4 rounded-2xl bg-card shadow-card p-4">
      <p className={`text-sm ${tone}`}>{feedback.verdict}</p>
      <p className="text-sm leading-relaxed text-ink">{feedback.comment}</p>

      {feedback.errors?.length > 0 && (
        <div className="space-y-3 border-t border-line pt-3">
          {feedback.errors.map((e, i) => (
            <div key={i} className="text-sm">
              <p>
                <span className="text-rose line-through">{e.wrong}</span>
                <span className="text-muted"> → </span>
                <span className="text-lilacText">{e.fix}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">{e.why}</p>
            </div>
          ))}
        </div>
      )}

      {feedback.upgrades?.length > 0 && (
        <div className="space-y-3 border-t border-line pt-3">
          <p className="text-xs text-muted">Nói hay hơn</p>
          {feedback.upgrades.map((u, i) => (
            <div key={i} className="text-sm">
              <p>
                <span className="text-muted">{u.from}</span>
                <span className="text-muted"> → </span>
                <span className="text-ink">{u.to}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">{u.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ reason, difficulty }: { reason: string | null; difficulty: Difficulty }) {
  if (reason === 'offline') {
    return <Centered>Mất mạng rồi. Thử lại khi có sóng nhé.</Centered>;
  }
  if (reason === 'no_cards_at_difficulty') {
    return (
      <Centered>
        Kho mặc định chưa có {DIFFICULTY_LABEL[difficulty].toLowerCase()} nào. Đổi mức khác, hoặc nạp
        thêm tài liệu.
      </Centered>
    );
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Mascot size={116} mood="sleepy" />
      <p className="max-w-xs leading-relaxed text-muted">
        Chưa có gì để dịch. Chụp bản tiếng Anh và bản tiếng Việt của một tài liệu, phần còn lại tự
        động.
      </p>
      <Link href="/library/new" className="rounded-2xl bg-brand px-6 py-3 font-semibold text-onBrand shadow-brand">
        Nạp tài liệu đầu tiên
      </Link>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8 text-center leading-relaxed text-muted">
      {children}
    </div>
  );
}

function FixSheet({
  vi,
  en,
  onVi,
  onEn,
  onSave,
  onDrop,
  onClose,
}: {
  vi: string;
  en: string;
  onVi: (v: string) => void;
  onEn: (v: string) => void;
  onSave: () => void;
  onDrop: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 p-3">
      <div className="reveal w-full max-w-md rounded-3xl bg-card p-5 shadow-lift">
        <p className="font-bold">Sửa câu này</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Hay gặp với câu tách từ ảnh: chữ đọc sai, hoặc ghép nhầm cặp.
        </p>

        <label className="mt-4 block text-xs font-semibold text-muted">Tiếng Việt</label>
        <textarea
          value={vi}
          onChange={(e) => onVi(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-2xl bg-sand p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/60"
        />

        <label className="mt-3 block text-xs font-semibold text-muted">Tiếng Anh gốc</label>
        <textarea
          value={en}
          onChange={(e) => onEn(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-2xl bg-sand p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/60"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-sand py-3 font-semibold text-muted"
          >
            Thôi
          </button>
          <button
            onClick={onSave}
            disabled={!vi.trim() || !en.trim()}
            className="flex-1 rounded-2xl bg-brand py-3 font-semibold text-onBrand shadow-brand disabled:opacity-35"
          >
            Lưu
          </button>
        </div>
        <button
          onClick={onDrop}
          className="mt-3 w-full py-1 text-sm font-semibold text-rose"
        >
          Xoá hẳn câu này
        </button>
      </div>
    </div>
  );
}

function GoalToast({ goal }: { goal: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
      <div className="pop flex items-center gap-3 rounded-2xl bg-card px-5 py-3 shadow-lift">
        <Mascot size={36} mood="cheer" />
        <div>
          <p className="text-sm font-bold text-brandDeep">Xong mục tiêu hôm nay</p>
          <p className="text-xs text-muted">{goal} câu. Làm thêm vẫn tính điểm.</p>
        </div>
      </div>
    </div>
  );
}

function BadgeToast({ badgeKey }: { badgeKey: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
      <div className="reveal rounded-2xl border border-brand/40 bg-sand px-5 py-3 text-center">
        <p className="text-sm text-brand">Đạt mốc {badgeLabel(badgeKey)}</p>
      </div>
    </div>
  );
}

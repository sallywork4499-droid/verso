'use client';

/*
 * Các khối phụ của màn hình luyện. Tách ra từ Practice.tsx ở v2.8
 * để file chính chỉ còn phần điều khiển vòng lặp.
 */
import Link from 'next/link';
import { badgeLabel } from '@/lib/scoring';
import Mascot from '@/components/Mascot';
import GoalRing from '@/components/GoalRing';
import type { Card, Feedback } from '@/lib/types';

export function StatusBar({
  streak,
  points,
  gained,
  done,
  doneToday,
  goal,
  onNavigate,
}: {
  streak: number;
  points: number;
  gained: number | null;
  done: number;
  doneToday: number;
  goal: number;
  onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, to: string) => void;
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
        <Link href="/library" onClick={(e) => onNavigate(e, '/library')} className="hover:text-ink">
          Thư viện
        </Link>
        <Link href="/dashboard" onClick={(e) => onNavigate(e, '/dashboard')} className="hover:text-ink">
          Tiến độ
        </Link>
      </nav>
    </header>
  );
}

export function Review({
  card,
  answer,
  feedback,
  grading,
  gradeError,
  onCorrect,
  onWrong,
  onRetry,
  onRegrade,
  busy,
}: {
  card: Card;
  answer: string;
  feedback: Feedback | null;
  grading: boolean;
  gradeError: string | null;
  onCorrect: () => void;
  onWrong: () => void;
  onRetry: () => void;
  onRegrade: () => void;
  busy: boolean;
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-muted">
              Bản gốc ở trên vẫn đủ để tự đối chiếu.
            </p>
            <button
              onClick={onRegrade}
              disabled={grading}
              className="shrink-0 rounded-xl bg-sand px-4 py-2 text-sm font-semibold text-brandDeep disabled:opacity-40"
            >
              Chấm lại
            </button>
          </div>
        </div>
      )}
      {feedback && <FeedbackCard feedback={feedback} />}
    </div>
  );
}

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
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

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8 text-center leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function FixSheet({
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
    <div
      className="fixed inset-x-0 z-20 flex items-end justify-center bg-ink/40 p-3"
      style={{ top: 'var(--app-top, 0px)', height: 'var(--app-h, 100dvh)' }}
    >
      <div className="reveal max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-lift">
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

export function GoalToast({ goal }: { goal: number }) {
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

export function BadgeToast({ badgeKey }: { badgeKey: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
      <div className="reveal rounded-2xl border border-brand/40 bg-sand px-5 py-3 text-center">
        <p className="text-sm text-brand">Đạt mốc {badgeLabel(badgeKey)}</p>
      </div>
    </div>
  );
}

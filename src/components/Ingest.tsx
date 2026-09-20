'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTY_LABEL } from '@/lib/scoring';
import type { Difficulty, Pair } from '@/lib/types';

type Row = Pair & { duplicate?: boolean; keep: boolean };
type Step = 'pick' | 'reading' | 'review' | 'saving';
type Source = 'image' | 'text';

const ORDER: Difficulty[] = ['phrase', 'sentence', 'paragraph'];

export default function Ingest() {
  const [step, setStep] = useState<Step>('pick');
  const [source, setSource] = useState<Source>('text');
  const [imgEn, setImgEn] = useState<string | null>(null);
  const [imgVi, setImgVi] = useState<string | null>(null);
  const [txtEn, setTxtEn] = useState('');
  const [txtVi, setTxtVi] = useState('');
  const [split, setSplit] = useState(true);
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pick(which: 'en' | 'vi') {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await downscale(file);
      which === 'en' ? setImgEn(dataUrl) : setImgVi(dataUrl);
    };
  }

  const ready =
    source === 'image' ? Boolean(imgEn && imgVi) : Boolean(txtEn.trim() && txtVi.trim());

  async function read() {
    if (!ready) return;
    setStep('reading');
    setError(null);
    try {
      const payload =
        source === 'image'
          ? { imageEn: imgEn, imageVi: imgVi }
          : { textEn: txtEn, textVi: txtVi, split };
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Không xử lý được nội dung này');
        setStep('pick');
        return;
      }
      setTitle(data.title);
      setRows(data.pairs.map((p: Pair & { duplicate: boolean }) => ({ ...p, keep: !p.duplicate })));
      setStep('review');
    } catch {
      setError('Mất kết nối khi đang xử lý');
      setStep('pick');
    }
  }

  async function save() {
    setStep('saving');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: page, error: pageErr } = await supabase
      .from('pages')
      .insert({ user_id: user.id, title: title || 'Trang bài mới' })
      .select()
      .single();

    if (pageErr || !page) {
      setError('Không lưu được trang bài');
      setStep('review');
      return;
    }

    const keep = rows.filter((r) => r.keep);
    const { error: cardErr } = await supabase.from('cards').insert(
      keep.map((r) => ({
        page_id: page.id,
        user_id: user.id,
        vi_text: r.vi.trim(),
        en_text: r.en.trim(),
        difficulty: r.difficulty,
      }))
    );

    if (cardErr) {
      setError('Không lưu được các câu');
      setStep('review');
      return;
    }
    router.push('/');
    router.refresh();
  }

  /* ---------- bước chọn nguồn ---------- */
  if (step === 'pick' || step === 'reading') {
    const busy = step === 'reading';
    return (
      <main className="mx-auto min-h-[100dvh] max-w-md px-4 pb-16 pt-4">
        <Link href="/library" className="text-sm text-muted hover:text-ink">
          ← Thư viện
        </Link>
        <h1 className="mt-6 font-study text-3xl text-ink">Nạp tài liệu</h1>

        <div className="mt-6 flex gap-1">
          {(['text', 'image'] as Source[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setSource(m);
                setError(null);
              }}
              className={`flex-1 rounded-xl py-2 text-sm transition-colors ${
                source === m
                  ? 'bg-card text-brand shadow-card'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'text' ? 'Dán văn bản' : 'Chụp ảnh'}
            </button>
          ))}
        </div>

        {source === 'text' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Dán hai bản của cùng một nội dung. App tự tách câu, trích cụm từ đáng học và ghép cặp.
            </p>
            <Field
              label="Bản tiếng Anh gốc"
              value={txtEn}
              onChange={setTxtEn}
              placeholder="The government should impose stricter regulations…"
            />
            <Field
              label="Bản dịch tiếng Việt"
              value={txtVi}
              onChange={setTxtVi}
              placeholder="Chính phủ nên áp dụng các quy định chặt chẽ hơn…"
              study
            />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-card shadow-card p-4">
              <input
                type="checkbox"
                checked={!split}
                onChange={(e) => setSplit(!e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span className="text-sm leading-relaxed text-muted">
                Giữ nguyên, không tách
                <span className="mt-0.5 block text-xs">
                  Cả đoạn thành đúng một bản ghi ở mức Đoạn. Nhanh, không gọi model.
                </span>
              </span>
            </label>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Chụp hai bản của cùng một nội dung. Việc tách câu và ghép cặp để app lo.
            </p>
            <Picker label="Bản tiếng Anh gốc" image={imgEn} onPick={pick('en')} />
            <Picker label="Bản dịch tiếng Việt" image={imgVi} onPick={pick('vi')} />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose">{error}</p>}

        <button
          onClick={read}
          disabled={!ready || busy}
          className="mt-6 w-full rounded-2xl bg-brand py-3.5 font-semibold text-white shadow-brand disabled:opacity-30"
        >
          {busy ? 'Đang xử lý…' : source === 'text' && !split ? 'Lưu nguyên đoạn' : 'Tách thành câu'}
        </button>
        {busy && (
          <p className="mt-3 text-center text-sm text-muted">
            Mất chừng nửa phút. Đừng đóng màn hình này.
          </p>
        )}
      </main>
    );
  }

  /* ---------- bước duyệt ---------- */
  const kept = rows.filter((r) => r.keep).length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 pb-32 pt-4">
      <h1 className="font-study text-3xl text-ink">Duyệt lại</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sửa chỗ nào lệch, bỏ chọn câu không cần. Câu trùng với thư viện đã được bỏ chọn sẵn.
      </p>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-6 w-full rounded-2xl bg-card shadow-card px-4 py-3 text-ink focus:border-brand/60 focus:outline-none"
      />

      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className={`rounded-2xl border bg-card p-3 ${
              row.keep ? 'border-line' : 'border-line/40 opacity-50'
            }`}
          >
            <div className="mb-2 flex items-center gap-3 text-xs">
              <button
                onClick={() =>
                  setRows((rs) => rs.map((r, j) => (j === i ? { ...r, keep: !r.keep } : r)))
                }
                className={`h-4 w-4 shrink-0 rounded border ${
                  row.keep ? 'border-brand bg-brand' : 'border-line'
                }`}
                aria-label={row.keep ? 'Bỏ câu này' : 'Giữ câu này'}
              />
              <select
                value={row.difficulty}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, j) =>
                      j === i ? { ...r, difficulty: e.target.value as Difficulty } : r
                    )
                  )
                }
                className="rounded bg-sand px-2 py-1 text-muted focus:outline-none"
              >
                {ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
              {row.duplicate && <span className="text-brand">đã có trong thư viện</span>}
            </div>

            <textarea
              value={row.vi}
              onChange={(e) =>
                setRows((rs) => rs.map((r, j) => (j === i ? { ...r, vi: e.target.value } : r)))
              }
              rows={2}
              className="w-full resize-none bg-transparent font-study text-sm text-ink focus:outline-none"
            />
            <textarea
              value={row.en}
              onChange={(e) =>
                setRows((rs) => rs.map((r, j) => (j === i ? { ...r, en: e.target.value } : r)))
              }
              rows={2}
              className="mt-1 w-full resize-none border-t border-line bg-transparent pt-2 text-sm text-muted focus:outline-none"
            />
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-rose">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-page/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={save}
            disabled={kept === 0 || step === 'saving'}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-white shadow-brand disabled:opacity-30"
          >
            {step === 'saving' ? 'Đang lưu…' : `Lưu ${kept} câu`}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  study,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  study?: boolean;
}) {
  return (
    <label className="block rounded-2xl bg-card shadow-card p-4 focus-within:border-brand/60">
      <span className="text-xs text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className={`mt-2 w-full resize-none bg-transparent leading-relaxed text-ink placeholder:text-muted/50 focus:outline-none ${
          study ? 'font-study' : ''
        }`}
      />
    </label>
  );
}

function Picker({
  label,
  image,
  onPick,
}: {
  label: string;
  image: string | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl bg-card shadow-card p-4">
      <div className="flex items-center justify-between">
        <span className={image ? 'text-brand' : 'text-muted'}>{label}</span>
        <span className="text-sm text-muted">{image ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mt-3 max-h-40 w-full rounded-xl object-cover" />
      )}
      <input type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
    </label>
  );
}

/** Nén ảnh trước khi gửi để tiết kiệm băng thông và token. */
async function downscale(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

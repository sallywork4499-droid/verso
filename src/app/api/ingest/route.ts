import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, NO_KEY_MESSAGE, type Part } from '@/lib/ai';
import type { Pair } from '@/lib/types';

export const maxDuration = 60;

const COMMON = `Việc của bạn:
2. Ghép cặp từng đoạn tiếng Việt với đoạn tiếng Anh tương ứng.
3. Tách ở cả ba cấp độ từ cùng một nguồn:
   - "sentence": mỗi câu hoàn chỉnh là một bản ghi. Đây là phần chính.
   - "phrase": các collocation, phrasal verb, cụm từ đáng học ở band 6.0-7.0 trích từ những câu đó. Mỗi cụm là một bản ghi riêng, phần tiếng Việt là nghĩa của cụm trong ngữ cảnh.
   - "paragraph": mỗi đoạn văn hoàn chỉnh là một bản ghi.
4. Bỏ qua tiêu đề trang, số trang, chú thích nguồn, watermark.

Nếu hai bản rõ ràng không phải hai phiên bản của cùng một nội dung, trả về {"error": "hai bản không khớp nội dung"}.

Chỉ trả về JSON thuần, không markdown, không lời dẫn:
{"title": "...", "pairs": [{"vi": "...", "en": "...", "difficulty": "phrase|sentence|paragraph"}]}`;

const SYSTEM_IMAGE = `Bạn là bộ xử lý tài liệu song ngữ cho một app luyện dịch ngược Việt - Anh.

Người dùng gửi hai ảnh: ảnh thứ nhất là bản TIẾNG ANH gốc, ảnh thứ hai là bản dịch TIẾNG VIỆT của cùng nội dung đó.

1. Đọc chữ trong cả hai ảnh, giữ nguyên chính tả, dấu câu và dấu tiếng Việt.
Nếu ảnh mờ không đọc được, trả về {"error": "ảnh không đọc được"}.
` + COMMON;

const SYSTEM_TEXT = `Bạn là bộ xử lý tài liệu song ngữ cho một app luyện dịch ngược Việt - Anh.

Người dùng dán vào hai đoạn văn bản: bản TIẾNG ANH gốc và bản dịch TIẾNG VIỆT của cùng nội dung đó.

1. Giữ nguyên chính tả, dấu câu và dấu tiếng Việt của bản gốc, không sửa lỗi của người dùng.
` + COMMON;

type Result = { error: string } | { title: string; pairs: Pair[] };

function splitDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) throw new Error('Định dạng ảnh không hỗ trợ');
  return { mediaType: m[1], data: m[2] };
}

/** Lấy vài chữ đầu làm tiêu đề gợi ý khi model không đặt tên. */
function firstWords(text: string, max = 48): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length <= max ? t : t.slice(0, max).replace(/\s\S*$/, '') + '…';
}

/** Đánh dấu câu đã có trong thư viện để người dùng khỏi nạp trùng. */
async function markDuplicates(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pairs: Pair[]
) {
  // Chỉ hỏi những câu sắp nạp, thay vì kéo cả thư viện về
  const wanted = Array.from(new Set(pairs.map((p) => p.vi.trim()))).slice(0, 300);
  const { data: existing } = await supabase
    .from('cards')
    .select('vi_text')
    .eq('user_id', userId)
    .in('vi_text', wanted);

  const seen = new Set((existing ?? []).map((c) => c.vi_text.trim().toLowerCase()));
  return pairs.map((p) => ({ ...p, duplicate: seen.has(p.vi.trim().toLowerCase()) }));
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const provider = getProvider('ingest');
  if (!provider) return NextResponse.json({ error: NO_KEY_MESSAGE }, { status: 503 });

  let body: {
    imageEn?: string;
    imageVi?: string;
    textEn?: string;
    textVi?: string;
    split?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ' }, { status: 400 });
  }

  const { imageEn, imageVi, textEn, textVi, split = true } = body;
  const byText = Boolean(textEn?.trim() && textVi?.trim());
  const byImage = Boolean(imageEn && imageVi);

  if (!byText && !byImage) {
    return NextResponse.json(
      { error: 'Cần hai ảnh, hoặc hai đoạn văn bản Anh và Việt' },
      { status: 400 }
    );
  }

  // Dán text và không muốn tách: cả đoạn thành đúng một bản ghi, khỏi gọi model
  if (byText && !split) {
    const pairs: Pair[] = [
      { vi: textVi!.trim(), en: textEn!.trim(), difficulty: 'paragraph' },
    ];
    return NextResponse.json({
      title: firstWords(textVi!),
      provider: 'không dùng model',
      pairs: await markDuplicates(supabase, user.id, pairs),
    });
  }

  try {
    let system: string;
    let parts: Part[];

    if (byText) {
      system = SYSTEM_TEXT;
      parts = [
        {
          kind: 'text',
          text: `Bản tiếng Anh gốc:\n${textEn!.trim()}\n\nBản dịch tiếng Việt:\n${textVi!.trim()}\n\nXử lý theo đúng hướng dẫn và trả JSON.`,
        },
      ];
    } else {
      const en = splitDataUrl(imageEn!);
      const vi = splitDataUrl(imageVi!);
      system = SYSTEM_IMAGE;
      parts = [
        { kind: 'text', text: 'Ảnh 1 — bản tiếng Anh gốc:' },
        { kind: 'image', ...en },
        { kind: 'text', text: 'Ảnh 2 — bản dịch tiếng Việt:' },
        { kind: 'image', ...vi },
        { kind: 'text', text: 'Xử lý theo đúng hướng dẫn và trả JSON.' },
      ];
    }

    const parsed = await provider.askJson<Result>({ system, parts, maxTokens: 8000 });

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    const pairs = (parsed.pairs ?? []).filter(
      (p) => p.vi?.trim() && p.en?.trim() && ['phrase', 'sentence', 'paragraph'].includes(p.difficulty)
    );
    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'Không tách được câu nào từ hai ảnh này' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: parsed.title || firstWords(textVi ?? '') || 'Đoạn mới',
      provider: provider.name,
      pairs: await markDuplicates(supabase, user.id, pairs),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
    return NextResponse.json({ error: `Không xử lý được ảnh: ${msg}` }, { status: 500 });
  }
}

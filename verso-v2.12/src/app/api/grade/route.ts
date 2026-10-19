import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, NO_KEY_MESSAGE } from '@/lib/ai';

export const maxDuration = 30;

const SYSTEM = `Bạn là huấn luyện viên IELTS khắt khe, đang chấm bài dịch ngược Việt - Anh cho học viên đang ở band 4.5 muốn lên 7.0.

Học viên đọc một đoạn tiếng Việt và tự viết lại bằng tiếng Anh. Bạn nhận được đoạn tiếng Việt, bản tiếng Anh gốc, và bản học viên viết.

Nguyên tắc chấm:
- Bản học viên KHÔNG cần giống hệt bản gốc. Diễn đạt khác mà đúng ngữ pháp và đúng nghĩa thì vẫn là đạt.
- Chỉ bắt lỗi thật: sai ngữ pháp, sai collocation, dùng từ sai nghĩa, thiếu ý, dịch word-by-word.
- Không bắt bẻ khác biệt thuần phong cách.
- Nhận xét ngắn, thẳng, bằng tiếng Việt. Khắt khe nhưng không mỉa mai.

Chỉ trả JSON thuần, không markdown:
{
  "verdict": "sát nghĩa" | "lệch nhẹ" | "sai",
  "errors": [{"wrong": "phần sai trong bài học viên", "fix": "cách viết đúng", "why": "lý do ngắn gọn"}],
  "upgrades": [{"from": "từ/cụm cơ bản học viên dùng", "to": "cách nói band cao hơn", "note": "vì sao hay hơn"}],
  "comment": "một đến hai câu nhận xét tổng thể"
}
Tối đa 4 lỗi và 3 gợi ý nâng cấp. Không có lỗi thì errors là mảng rỗng.`;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const provider = getProvider('grade');
  if (!provider) return NextResponse.json({ error: NO_KEY_MESSAGE }, { status: 503 });

  let body: { vi?: string; en?: string; answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const { vi, en, answer } = body;
  if (!vi || !en || !answer) {
    return NextResponse.json({ error: 'Thiếu dữ liệu để chấm' }, { status: 400 });
  }

  try {
    const feedback = await provider.askJson({
      system: SYSTEM,
      maxTokens: 1500,
      parts: [
        {
          kind: 'text',
          text: `Đoạn tiếng Việt:\n${vi}\n\nBản tiếng Anh gốc:\n${en}\n\nBản học viên viết:\n${answer}`,
        },
      ],
    });
    return NextResponse.json(feedback);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Chưa chấm được lúc này';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

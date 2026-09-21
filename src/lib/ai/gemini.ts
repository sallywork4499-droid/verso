import { parseJson, type AskOptions, type Provider } from './types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Model không tồn tại, không có quyền, hay đang quá tải thì thử cái kế tiếp. */
function shouldTryNext(status: number) {
  return status === 404 || status === 403 || status === 400 || isOverloaded(status);
}

/** Lỗi phía Google, thường chỉ tạm thời: model đang quá tải hay trục trặc. */
function isOverloaded(status: number) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

/** Rút câu thông báo ra khỏi khối JSON lỗi của Google, cho người đọc được. */
function readableMessage(body: string): string {
  try {
    const msg = JSON.parse(body)?.error?.message;
    if (typeof msg === 'string' && msg) return msg.slice(0, 200);
  } catch {
    /* không phải JSON thì dùng nguyên văn */
  }
  return body.slice(0, 200);
}

/**
 * Nhớ model nào vừa chạy được, theo từng danh sách.
 * Lần gọi sau trong cùng một tiến trình khỏi phải thử lại những model đã chết,
 * đỡ mất một hai giây và đỡ tốn lượt gọi.
 */
const working = new Map<string, string>();

/**
 * Gọi Gemini qua REST, không cần thêm thư viện.
 * Nhận một danh sách model: thử lần lượt cho tới khi có cái chạy được,
 * để app không chết khi Google đổi tên hay khai tử một model.
 */
export function gemini(apiKey: string, models: string[]): Provider {
  const list = models.filter(Boolean);
  return {
    name: 'gemini',
    model: list[0] ?? '(chưa đặt model)',
    async askJson<T>({ system, parts, maxTokens }: AskOptions): Promise<T> {
      const cacheKey = list.join('|');
      const known = working.get(cacheKey);
      // Model đã biết là chạy được thì thử trước tiên
      const order = known ? [known, ...list.filter((m) => m !== known)] : list;

      const tried: string[] = [];
      let lastError = '';
      let lastStatus = 0;

      for (const model of order) {
        const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              {
                role: 'user',
                parts: parts.map((p) =>
                  p.kind === 'text'
                    ? { text: p.text }
                    : { inline_data: { mime_type: p.mediaType, data: p.data } }
                ),
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: maxTokens,
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
            .map((p: { text?: string }) => p.text ?? '')
            .join('');

          if (!text) {
            const reason = data?.candidates?.[0]?.finishReason;
            if (reason === 'MAX_TOKENS') {
              throw new Error('Nội dung quá dài, model trả về dở dang. Thử đoạn ngắn hơn.');
            }
            throw new Error(
              reason === 'SAFETY'
                ? 'Gemini từ chối xử lý nội dung này'
                : 'Gemini không trả về nội dung'
            );
          }
          working.set(cacheKey, model);
          return parseJson<T>(text);
        }

        const body = await res.text().catch(() => '');
        tried.push(model);
        if (working.get(cacheKey) === model) working.delete(cacheKey);

        if (res.status === 429) {
          throw new Error(
            'Gemini báo vượt hạn mức miễn phí. Đợi ít phút rồi thử lại, hoặc kiểm tra hạn mức trong AI Studio.'
          );
        }
        if (res.status === 401 || body.includes('API_KEY_INVALID')) {
          throw new Error(
            'Khoá GEMINI_API_KEY không hợp lệ. Tạo khoá mới ở aistudio.google.com/apikey rồi cập nhật trên Vercel và Redeploy.'
          );
        }
        if (!shouldTryNext(res.status)) {
          throw new Error(`Gemini lỗi ${res.status}: ${readableMessage(body)}`);
        }
        lastStatus = res.status;
        lastError = `${res.status}: ${readableMessage(body)}`;
      }

      // Mọi model đều quá tải: nói cho dễ hiểu thay vì đổ nguyên JSON ra màn hình
      if (isOverloaded(lastStatus)) {
        throw new Error('Gemini đang quá tải, thường tự hết sau vài phút. Bấm Chấm lại để thử lần nữa.');
      }
      throw new Error(
        `Không model nào dùng được. Đã thử: ${tried.join(', ')}. Lỗi cuối — ${lastError}`
      );
    },
  };
}

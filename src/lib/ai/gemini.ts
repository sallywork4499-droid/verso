import { parseJson, type AskOptions, type Provider } from './types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gọi Gemini qua REST, không cần thêm thư viện.
 * responseMimeType ép model trả JSON thuần, đỡ phải bóc rào markdown.
 */
export function gemini(apiKey: string, model: string): Provider {
  return {
    name: 'gemini',
    model,
    async askJson<T>({ system, parts, maxTokens }: AskOptions): Promise<T> {
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

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 429) throw new Error('Gemini báo vượt hạn mức, thử lại sau ít phút');
        throw new Error(`Gemini lỗi ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? '')
        .join('');

      if (!text) {
        const reason = data?.candidates?.[0]?.finishReason;
        throw new Error(
          reason === 'SAFETY'
            ? 'Gemini từ chối xử lý nội dung này'
            : 'Gemini không trả về nội dung'
        );
      }
      return parseJson<T>(text);
    },
  };
}

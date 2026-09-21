import { anthropic } from './anthropic';
import { gemini } from './gemini';
import type { Provider, Task } from './types';

export type { Part, Provider, Task } from './types';

/**
 * Danh sách model thử lần lượt. Đặt model mới trước, model cũ sau làm lưới an toàn.
 * Google đổi tên và khai tử model khá thường xuyên: dòng 2.5 ngừng hoạt động
 * từ tháng 10/2026, nên để một mình nó là app sẽ chết.
 */
const GEMINI_MODELS = {
  // Đọc chữ từ ảnh cần model khoẻ hơn
  ingest: [
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
  ],
  // Chấm một câu dịch thì model nhẹ là đủ, lại tốn ít hạn mức hơn
  grade: [
    'gemini-3.6-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ],
};

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

/**
 * Chọn nhà cung cấp cho từng việc.
 *
 *   AI_PROVIDER=gemini            áp cho cả hai việc
 *   AI_PROVIDER_INGEST=anthropic  ghi đè riêng việc đọc ảnh
 *   AI_PROVIDER_GRADE=gemini      ghi đè riêng việc chấm bài
 *
 * Không đặt gì thì tự dò: có GEMINI_API_KEY thì dùng Gemini, không thì Claude.
 * GEMINI_MODEL_INGEST / GEMINI_MODEL_GRADE nhận một hoặc nhiều tên model
 * cách nhau bằng dấu phẩy, và được thử trước danh sách mặc định.
 */
export function getProvider(task: Task): Provider | null {
  const want =
    process.env[`AI_PROVIDER_${task.toUpperCase()}`] ??
    process.env.AI_PROVIDER ??
    (process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic');

  if (want === 'gemini') {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) return null;
    const override = process.env[`GEMINI_MODEL_${task.toUpperCase()}`]
      ?.split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const models = [...(override ?? []), ...GEMINI_MODELS[task]];
    return gemini(key, Array.from(new Set(models)));
  }

  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return anthropic(key, process.env.ANTHROPIC_MODEL?.trim() ?? ANTHROPIC_MODEL);
}

export const NO_KEY_MESSAGE =
  'Chưa cấu hình khoá model. Đặt GEMINI_API_KEY (miễn phí) hoặc ANTHROPIC_API_KEY trong biến môi trường trên Vercel, rồi Redeploy.';

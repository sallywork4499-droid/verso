import { anthropic } from './anthropic';
import { gemini } from './gemini';
import type { Provider, Task } from './types';

export type { Part, Provider, Task } from './types';

const DEFAULT_MODELS = {
  // Flash-Lite hạn mức miễn phí cao nhất, đủ cho việc chấm một câu dịch
  geminiGrade: 'gemini-2.5-flash-lite',
  // Đọc chữ từ ảnh cần model khoẻ hơn một bậc
  geminiIngest: 'gemini-2.5-flash',
  anthropic: 'claude-sonnet-4-6',
};

/**
 * Chọn nhà cung cấp cho từng việc.
 * Đổi nhà cung cấp chỉ cần sửa biến môi trường, không đụng vào code.
 *
 *   AI_PROVIDER=gemini            áp cho cả hai việc
 *   AI_PROVIDER_INGEST=anthropic  ghi đè riêng việc đọc ảnh
 *   AI_PROVIDER_GRADE=gemini      ghi đè riêng việc chấm bài
 *
 * Không đặt gì thì tự dò: có GEMINI_API_KEY thì dùng Gemini, không thì Claude.
 */
export function getProvider(task: Task): Provider | null {
  const want =
    process.env[`AI_PROVIDER_${task.toUpperCase()}`] ??
    process.env.AI_PROVIDER ??
    (process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic');

  if (want === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    const model =
      process.env[`GEMINI_MODEL_${task.toUpperCase()}`] ??
      (task === 'ingest' ? DEFAULT_MODELS.geminiIngest : DEFAULT_MODELS.geminiGrade);
    return gemini(key, model);
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return anthropic(key, process.env.ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic);
}

/** Câu nhắc người dùng khi chưa cấu hình khoá nào. */
export const NO_KEY_MESSAGE =
  'Chưa cấu hình khoá model. Đặt GEMINI_API_KEY (miễn phí) hoặc ANTHROPIC_API_KEY trong biến môi trường.';

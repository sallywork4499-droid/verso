/** Một mẩu nội dung gửi cho model: chữ hoặc ảnh. */
export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mediaType: string; data: string };

export type AskOptions = {
  system: string;
  parts: Part[];
  maxTokens: number;
};

/** Giao diện chung để hai nhà cung cấp thay thế nhau được. */
export type Provider = {
  name: string;
  model: string;
  /** Hỏi model và trả về JSON đã parse. Ném lỗi nếu model trả về thứ không parse được. */
  askJson: <T>(opts: AskOptions) => Promise<T>;
};

/** Việc mà app cần model làm. Mỗi việc chọn nhà cung cấp riêng được. */
export type Task = 'ingest' | 'grade';

/**
 * Model hay bọc JSON trong ```json dù đã dặn đừng.
 * Bóc rào, rồi nếu vẫn lỗi thì cắt từ dấu ngoặc đầu tới dấu ngoặc cuối.
 */
export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (start === -1 || end <= start) throw new Error('Model không trả về JSON hợp lệ');
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}

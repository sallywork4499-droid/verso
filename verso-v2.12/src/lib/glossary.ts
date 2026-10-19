/**
 * Tách một danh sách từ vựng dán vào thành từng cặp Anh - Việt.
 * Chạy ngay trên máy, không gọi model: nhanh, miễn phí, và đoán được
 * hầu hết cách trình bày thường gặp.
 */
import type { Difficulty, Pair } from './types';

/** Mức khó gán cho cả danh sách, hoặc để app tự đoán từng dòng. */
export type LevelChoice = Difficulty | 'auto';

export type ParsedLine =
  | { ok: true; en: string; vi: string }
  | { ok: false; raw: string };

/** Dấu tiếng Việt: dùng để đoán bên nào là tiếng Việt. */
const VI_MARKS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/**
 * Dấu ngăn giữa hai vế, thử theo thứ tự.
 * Những dấu dễ nhầm với nội dung (gạch nối, hai chấm) bắt buộc phải có
 * khoảng trắng bao quanh, để không cắt nhầm "well-being" hay "note: x".
 */
const SEPARATORS = [
  '\t',
  ' = ',
  ' — ',
  ' – ',
  ' -- ',
  ' : ',
  ': ',
  ' - ',
  '=',
  '—',
  '–',
  ' | ',
  '|',
];

/** Bỏ số thứ tự và dấu đầu dòng: "1.", "2)", "-", "•", "*". */
function stripBullet(line: string): string {
  return line.replace(/^\s*(?:\d+\s*[.)\]]|[-–—•*·+])\s+/, '').trim();
}

function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’(\[]+|["'“”‘’)\]]+$/g, '')
    .replace(/[.;,]+$/, '')
    .trim();
}

const isVietnamese = (s: string) => VI_MARKS.test(s);

/** Tách một dòng thành hai vế, tự đoán vế nào là tiếng Anh. */
export function parseLine(raw: string): ParsedLine {
  const line = stripBullet(raw);
  if (!line) return { ok: false, raw };

  for (const sep of SEPARATORS) {
    const at = line.indexOf(sep);
    if (at <= 0) continue;

    let left = tidy(line.slice(0, at));
    let right = tidy(line.slice(at + sep.length));
    if (!left || !right) continue;

    // Hai vế đều có dấu tiếng Việt thì đây không phải cặp Anh - Việt,
    // thường là dòng tiêu đề kiểu "Chương 3: từ vựng"
    if (isVietnamese(left) && isVietnamese(right)) continue;

    // Người dùng có thể dán theo chiều Việt trước, Anh sau
    if (isVietnamese(left) && !isVietnamese(right)) {
      [left, right] = [right, left];
    }
    return { ok: true, en: left, vi: right };
  }

  return { ok: false, raw: line };
}

/**
 * Đoán mức khó của một dòng dựa vào vế tiếng Anh.
 * Một cụm từ vựng thường ngắn và không có dấu kết câu;
 * một câu hoàn chỉnh thì dài hơn và hay kết thúc bằng dấu chấm.
 */
export function guessLevel(en: string, vi: string): Difficulty {
  const words = en.trim().split(/\s+/).length;
  const ends = /[.!?]$/.test(en.trim());
  const sentences = (en.match(/[.!?](\s|$)/g) ?? []).length;

  if (words >= 40 || sentences >= 2) return 'paragraph';
  if (words >= 6 || ends) return 'sentence';
  // Vế tiếng Việt dài bất thường cũng là dấu hiệu đây là câu
  if (vi.trim().split(/\s+/).length >= 10) return 'sentence';
  return 'phrase';
}

export type GlossaryResult = {
  pairs: Pair[];
  /** Những dòng không tách được, để người dùng tự sửa hoặc nhờ model. */
  unparsed: string[];
};

/**
 * Tách cả danh sách. Bỏ dòng trống, dòng tiêu đề, và cặp trùng nhau.
 * level mặc định là "phrase" vì đây thường là danh sách từ vựng;
 * truyền "auto" để app tự đoán từng dòng là cụm từ hay câu.
 */
export function parseGlossary(text: string, level: LevelChoice = 'phrase'): GlossaryResult {
  const pairs: Pair[] = [];
  const unparsed: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;

    const parsed = parseLine(raw);
    if (!parsed.ok) {
      unparsed.push(parsed.raw);
      continue;
    }

    // Hai vế giống hệt nhau thì không phải cặp từ vựng
    if (parsed.en.toLowerCase() === parsed.vi.toLowerCase()) {
      unparsed.push(raw.trim());
      continue;
    }

    const key = parsed.en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    pairs.push({
      en: parsed.en,
      vi: parsed.vi,
      difficulty: level === 'auto' ? guessLevel(parsed.en, parsed.vi) : level,
    });
  }

  return { pairs, unparsed };
}

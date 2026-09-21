import { guessLevel, parseGlossary, parseLine } from '../src/lib/glossary';

let fails = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const pair = (l: string) => {
  const r = parseLine(l);
  return r.ok ? `${r.en} | ${r.vi}` : 'KHÔNG TÁCH ĐƯỢC';
};

console.log('\n── Các kiểu dấu ngăn ──');
check('Gạch dài', pair('curb emissions — hạn chế khí thải') === 'curb emissions | hạn chế khí thải');
check('Dấu bằng', pair('fall behind = tụt lại phía sau') === 'fall behind | tụt lại phía sau');
check('Hai chấm có khoảng trắng', pair('ease congestion : giảm tắc nghẽn') === 'ease congestion | giảm tắc nghẽn');
check('Hai chấm sát chữ', pair('fall behind: tụt lại phía sau') === 'fall behind | tụt lại phía sau');
check('Gạch ngắn có khoảng trắng', pair('invest heavily in - đầu tư mạnh vào') === 'invest heavily in | đầu tư mạnh vào');
check('Tab, kiểu dán từ bảng', pair('self-discipline\tkỷ luật tự giác') === 'self-discipline | kỷ luật tự giác');
check('Gạch đứng', pair('take into account | tính đến') === 'take into account | tính đến');

console.log('\n── Chỗ dễ cắt nhầm ──');
check('Gạch nối trong từ không bị cắt', pair('well-being — sự an lạc') === 'well-being | sự an lạc');
check('Cụm nhiều gạch nối', pair('state-of-the-art = hiện đại bậc nhất') === 'state-of-the-art | hiện đại bậc nhất');

console.log('\n── Tự đoán chiều ──');
check('Việt trước Anh sau thì tự đảo', pair('hạn chế khí thải — curb emissions') === 'curb emissions | hạn chế khí thải');

console.log('\n── Dọn rác đầu dòng ──');
check('Số thứ tự có chấm', pair('1. fall behind — tụt lại') === 'fall behind | tụt lại');
check('Số thứ tự có ngoặc', pair('12) fall behind — tụt lại') === 'fall behind | tụt lại');
check('Dấu đầu dòng', pair('• fall behind — tụt lại') === 'fall behind | tụt lại');
check('Bỏ dấu câu thừa cuối dòng', pair('fall behind — tụt lại phía sau.') === 'fall behind | tụt lại phía sau');
check('Bỏ ngoặc kép bao quanh', pair('"fall behind" — "tụt lại"') === 'fall behind | tụt lại');

console.log('\n── Dòng không tách được ──');
check('Dòng tiêu đề tiếng Việt không bị nhận nhầm', parseLine('Chương 3: từ vựng').ok === false);
check('Hai vế đều tiếng Việt thì bỏ qua', parseLine('bài tập — luyện tập').ok === false);
check('Dòng trống', parseLine('   ').ok === false);
check('Không có dấu ngăn', parseLine('curb emissions').ok === false);

console.log('\n── Tách cả danh sách ──');
const text = `Từ vựng bài 4

1. curb emissions — hạn chế khí thải
2. ease congestion = giảm tắc nghẽn
3. fall behind: tụt lại phía sau
well-being — sự an lạc
curb emissions — hạn chế lượng khí thải
dòng này không có dấu ngăn
`;
const r = parseGlossary(text);
check('Lấy đúng 4 cặp, bỏ cặp trùng', r.pairs.length === 4, `${r.pairs.length} cặp`);
check('Cặp trùng lấy bản đầu tiên', r.pairs[0].vi === 'hạn chế khí thải');
check('Gom lại dòng không tách được', r.unparsed.length === 2, r.unparsed.join(' / '));
check('Mặc định là mức Cụm từ', r.pairs.every((p) => p.difficulty === 'phrase'));
check('Đổi được mức mặc định', parseGlossary('a — b', 'sentence').pairs[0].difficulty === 'sentence');

console.log('\n── Dán nguyên bảng hai cột ──');
const table = `curb emissions\thạn chế khí thải
ease congestion\tgiảm tắc nghẽn`;
check('Hai dòng tab đều tách được', parseGlossary(table).pairs.length === 2);

console.log('\n── Gán mức khó cho cả danh sách ──');
const mix = `curb emissions — hạn chế khí thải
The government should impose stricter regulations. — Chính phủ nên áp dụng các quy định chặt chẽ hơn.`;
check('Ép tất cả thành Câu', parseGlossary(mix, 'sentence').pairs.every((p) => p.difficulty === 'sentence'));
check('Ép tất cả thành Đoạn', parseGlossary(mix, 'paragraph').pairs.every((p) => p.difficulty === 'paragraph'));

console.log('\n── Tự đoán từng dòng ──');
const auto = parseGlossary(mix, 'auto').pairs;
check('Cụm ngắn vẫn là Cụm từ', auto[0].difficulty === 'phrase', auto[0].difficulty);
check('Câu hoàn chỉnh nhận ra là Câu', auto[1].difficulty === 'sentence', auto[1].difficulty);

check('Cụm hai chữ là Cụm từ', guessLevel('fall behind', 'tụt lại') === 'phrase');
check('Cụm dài năm chữ vẫn là Cụm từ', guessLevel('take something into careful account', 'cân nhắc kỹ') === 'phrase');
check('Sáu chữ trở lên tính là Câu', guessLevel('the government should impose stricter rules', 'chính phủ nên siết quy định') === 'sentence');
check('Có dấu chấm cuối là Câu dù ngắn', guessLevel('She left.', 'Cô ấy đi rồi.') === 'sentence');
check('Nghĩa tiếng Việt dài bất thường cũng tính là Câu',
  guessLevel('benchmark', 'đối chuẩn với các doanh nghiệp khác trong cùng ngành để cải thiện hiệu suất') === 'sentence');
check('Nhiều câu liền nhau là Đoạn',
  guessLevel('He came. She left. They stayed.', 'Anh đến. Cô đi. Họ ở lại.') === 'paragraph');

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

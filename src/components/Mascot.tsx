/**
 * Nhân vật của app. Vẽ bằng SVG nên nhẹ, nét luôn sắc ở mọi kích cỡ.
 * mood đổi biểu cảm: happy khi bình thường, sleepy lúc chưa có bài, cheer khi đạt mốc.
 */
export default function Mascot({
  size = 120,
  mood = 'happy',
}: {
  size?: number;
  mood?: 'happy' | 'sleepy' | 'cheer';
}) {
  const id = `m-${mood}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="Nhân vật của Verso"
    >
      <defs>
        <linearGradient id={id} x1="24" y1="10" x2="96" y2="106">
          <stop stopColor="#FF9A5C" />
          <stop offset="1" stopColor="#F2661F" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="107" rx="26" ry="5" fill="#E8A87C" opacity="0.25" />

      <path d="M34 46C29 28 30 14 35 12c5-2 13 8 17 22z" fill={`url(#${id})`} />
      <path d="M86 46c5-18 4-32-1-34-5-2-13 8-17 22z" fill={`url(#${id})`} />
      <path
        d="M60 30c19 0 31 15 31 34 0 20-13 33-31 33S29 84 29 64c0-19 12-34 31-34z"
        fill={`url(#${id})`}
      />
      <ellipse cx="60" cy="78" rx="15" ry="13" fill="#FFC49C" opacity="0.55" />

      <path d="M31 72c-4 3-6 8-5 12" stroke="#E0591A" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />
      <path d="M89 72c4 3 6 8 5 12" stroke="#E0591A" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />

      {mood === 'sleepy' ? (
        <>
          <path d="M45 62c3.2 4 7.8 4 11 0" stroke="#2B2320" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M64 62c3.2 4 7.8 4 11 0" stroke="#2B2320" strokeWidth="3.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M45 62c3.2-4.5 7.8-4.5 11 0" stroke="#2B2320" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M64 62c3.2-4.5 7.8-4.5 11 0" stroke="#2B2320" strokeWidth="3.6" strokeLinecap="round" />
        </>
      )}

      <path d="M55.5 71c2.6 3.2 6.4 3.2 9 0" stroke="#2B2320" strokeWidth="3" strokeLinecap="round" />

      <ellipse cx="42" cy="70" rx="4.5" ry="3" fill="#F0484A" opacity="0.18" />
      <ellipse cx="78" cy="70" rx="4.5" ry="3" fill="#F0484A" opacity="0.18" />

      {mood === 'cheer' && (
        <g fill="#A78BF5">
          <path d="M20 36l2.2 5.3L27.5 44l-5.3 2.2L20 51.5l-2.2-5.3L12.5 44l5.3-2.2z" />
          <path d="M101 58l1.7 4 4 1.7-4 1.7-1.7 4-1.7-4-4-1.7 4-1.7z" opacity="0.85" />
        </g>
      )}
    </svg>
  );
}

/**
 * Vòng tiến độ mục tiêu hằng ngày.
 * Vẽ bằng SVG, không phụ thuộc thư viện nào.
 */
export default function GoalRing({
  done,
  goal,
  size = 34,
}: {
  done: number;
  goal: number;
  size?: number;
}) {
  const pct = goal > 0 ? Math.min(done / goal, 1) : 0;
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const hit = done >= goal && goal > 0;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      title={`${done}/${goal} câu hôm nay`}
      aria-label={`Đã xong ${done} trên ${goal} câu hôm nay`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="3.5"
          className="stroke-sand"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-brand transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-bold leading-none text-brandDeep">
        {hit ? '✓' : done}
      </span>
    </span>
  );
}

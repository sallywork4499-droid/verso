export const dynamic = 'force-dynamic';

const VARS = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', where: 'Supabase → Project Settings → API → Project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', where: 'cùng trang, mục anon public' },
  { name: 'GEMINI_API_KEY', where: 'aistudio.google.com/apikey' },
];

export default function Setup({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold">Chưa cấu hình xong</h1>

      {searchParams.reason && (
        <p className="mt-4 rounded-2xl bg-card p-4 text-sm leading-relaxed text-rose shadow-card">
          {searchParams.reason}
        </p>
      )}

      <p className="mt-5 leading-relaxed text-muted">
        App cần ba biến môi trường. Vào Vercel, mở project, chọn Settings rồi Environment Variables
        và thêm đủ ba biến dưới đây.
      </p>

      <ul className="mt-5 space-y-3">
        {VARS.map((v) => (
          <li key={v.name} className="rounded-2xl bg-card p-4 shadow-card">
            <p className="break-all font-mono text-sm font-semibold text-brand">{v.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{v.where}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2 text-sm leading-relaxed text-muted">
        <p>Vài chỗ hay sai: thiếu tiền tố NEXT_PUBLIC_ ở hai biến Supabase; dán kèm dấu nháy hoặc dấu cách thừa; địa chỉ có dấu gạch chéo ở cuối.</p>
        <p>
          Thêm biến xong phải vào tab Deployments, bấm dấu ba chấm ở lần deploy mới nhất rồi chọn
          Redeploy. Bản đang chạy không tự nhận biến mới.
        </p>
      </div>
    </main>
  );
}

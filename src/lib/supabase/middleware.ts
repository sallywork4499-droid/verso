import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Cấu hình có đủ và đúng dạng chưa. Trả về lý do nếu thiếu. */
function configProblem(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) return 'Thiếu biến NEXT_PUBLIC_SUPABASE_URL';
  if (!key) return 'Thiếu biến NEXT_PUBLIC_SUPABASE_ANON_KEY';
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith('http')) {
      return `NEXT_PUBLIC_SUPABASE_URL sai dạng: ${url}`;
    }
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL không phải một địa chỉ hợp lệ: ${url}`;
  }
  if (key.length < 40) return 'NEXT_PUBLIC_SUPABASE_ANON_KEY trông quá ngắn, có thể dán thiếu';
  return null;
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Cấu hình hỏng: đừng làm sập cả site, đưa người dùng tới trang chỉ rõ thiếu gì
  const problem = configProblem();
  if (problem) {
    console.error('[Verso] Cấu hình chưa xong:', problem);
    if (path.startsWith('/setup')) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = '/setup';
    url.searchParams.set('reason', problem);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isPublic =
      path.startsWith('/login') ||
      path.startsWith('/auth') ||
      path.startsWith('/setup') ||
      path.startsWith('/manifest') ||
      path.startsWith('/icon');

    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return response;
  } catch (e) {
    // Supabase trục trặc: cho request đi tiếp thay vì trả 500 cho mọi trang
    console.error('[Verso] Middleware lỗi:', e);
    return NextResponse.next({ request });
  }
}

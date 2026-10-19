import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Bỏ qua /api: mỗi route API vốn tự kiểm tra đăng nhập và tự làm mới phiên,
   * để middleware chạy thêm là mỗi lời gọi tốn gấp đôi số chuyến ra Supabase.
   * Bỏ qua cả tài nguyên tĩnh và service worker.
   */
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|webp|json|js)$).*)',
  ],
};

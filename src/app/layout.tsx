import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const ui = Nunito({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Verso',
  description: 'Luyện dịch ngược Việt - Anh trên tài liệu của chính bạn',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Verso' },
};

export const viewport: Viewport = {
  themeColor: '#FFF6F0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={ui.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('verso:theme');if(t&&t!=='auto')document.documentElement.setAttribute('data-theme',t);var d=t==='dark'||((!t||t==='auto')&&matchMedia('(prefers-color-scheme: dark)').matches);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#1C1614':'#FFF6F0');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

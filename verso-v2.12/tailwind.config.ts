import type { Config } from 'tailwindcss';

/** Màu lấy từ biến CSS để đổi được sáng/tối mà không phải viết hai bộ lớp. */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: v('--c-page'),
        card: v('--c-card'),
        sand: v('--c-sand'),
        brand: v('--c-brand'),
        brandDeep: v('--c-brand-deep'),
        lilac: v('--c-lilac'),
        lilacText: v('--c-lilac-text'),
        onBrand: v('--c-on-brand'),
        lilacSoft: v('--c-lilac-soft'),
        rose: v('--c-rose'),
        ink: v('--c-ink'),
        muted: v('--c-muted'),
        line: v('--c-line'),
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        study: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        prompt: ['1.6rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        promptSm: ['1.2rem', { lineHeight: '1.6' }],
      },
      borderRadius: { xl: '1rem', '2xl': '1.375rem', '3xl': '1.75rem' },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        brand: '0 6px 18px rgb(var(--c-brand) / 0.28)',
      },
    },
  },
  plugins: [],
};
export default config;

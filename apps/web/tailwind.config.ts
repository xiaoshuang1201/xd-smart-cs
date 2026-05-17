import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF2E8',
          100: '#FFE0CC',
          200: '#FFC499',
          300: '#FFA666',
          400: '#FA8C33',
          500: '#E8701A',
          600: '#D4380D',
          700: '#AD2E0A',
          800: '#8B2408',
          900: '#6B1C06',
        },
        accent: {
          400: '#FFC53D',
          500: '#FAAD14',
          600: '#D48806',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

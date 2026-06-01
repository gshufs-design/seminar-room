import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8edf7',
          100: '#c5d0ea',
          200: '#9fb1dc',
          300: '#7892cd',
          400: '#5879c2',
          500: '#3760b7',
          600: '#2d54a3',
          700: '#1e3d7d',
          800: '#132c5e',
          900: '#0a1c40',
          DEFAULT: '#003087',
        },
        navy: '#003087',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

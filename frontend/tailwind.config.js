/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#05080f',
          900: '#080c14',
          800: '#0d1117',
          700: '#111827',
          600: '#161b27',
          500: '#1e2635',
          400: '#2d3a52',
        },
        accent: {
          DEFAULT: '#3b82f6',
          bright: '#60a5fa',
          dim: 'rgba(59,130,246,0.12)',
          glow: 'rgba(59,130,246,0.25)',
        },
        amber: {
          key: '#f59e0b',
          dim: 'rgba(245,158,11,0.12)',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 0 1px rgba(59,130,246,0.3), 0 0 12px rgba(59,130,246,0.15)',
        'glow': '0 0 0 1px rgba(59,130,246,0.4), 0 0 24px rgba(59,130,246,0.2)',
        'glow-amber': '0 0 0 1px rgba(245,158,11,0.3), 0 0 12px rgba(245,158,11,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./examples/**/*.{js,ts,jsx,tsx}",
    "./xxxx/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        labstx: {
          black: 'var(--bg-primary)',
          dark: 'var(--bg-secondary)',
          panel: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)',
          orange: 'var(--stx-orange)',
          purple: 'var(--stx-purple)',
          accent: 'var(--stx-orange)',
          redDim: 'var(--red-dim)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          border: 'var(--border-color)'
        },
        caspier: {
          black: 'var(--bg-primary)',
          dark: 'var(--bg-secondary)',
          panel: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          border: 'var(--border-color)',
          red: 'var(--stx-orange)',
          active: 'var(--stx-orange)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neobrutal': '4px 4px 0 0 var(--stx-orange)',
        'neobrutal-sm': '2px 2px 0 0 var(--stx-orange)',
      }
    },
  },
  plugins: [],
}

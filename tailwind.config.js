/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Map Tailwind colors to CSS variables for automatic dark/light switching
        gray: {
          50: 'var(--text-primary)',
          100: 'var(--text-primary)',
          200: 'var(--text-secondary)',
          300: 'var(--text-secondary)',
          400: 'var(--text-muted)',
          500: 'var(--text-dim)',
          600: 'var(--text-dim)',
          700: 'var(--border-hover)',
          800: 'var(--bg-tertiary)',
          900: 'var(--bg-secondary)',
          950: 'var(--bg-primary)',
        },
        slate: {
          50: 'var(--text-primary)',
          100: 'var(--bg-tertiary)',
          200: 'var(--border-default)',
          300: 'var(--border-hover)',
          400: 'var(--text-dim)',
          500: 'var(--text-muted)',
          600: 'var(--text-muted)',
          700: 'var(--text-secondary)',
          800: 'var(--bg-secondary)',
          900: 'var(--text-primary)',
          950: 'var(--bg-primary)',
        },
        sidebar: {
          DEFAULT: 'var(--bg-secondary)',
          hover: 'var(--bg-tertiary)',
          active: 'var(--border-hover)',
          light: 'var(--bg-secondary)',
          'light-hover': 'var(--bg-tertiary)',
          'light-active': 'var(--border-hover)',
        },
        // OpenClaw red accent - used sparingly for tech feel
        accent: {
          DEFAULT: '#ef4444',       // red-500
          hover: '#dc2626',         // red-600
          light: '#fca5a5',        // red-300
          muted: '#fef2f2',        // red-50
          glow: 'rgba(239, 68, 68, 0.15)',
        },
        // Tech cyan for charts and highlights
        tech: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          emerald: '#10b981',
        },
        // Replace indigo/purple with neutral-friendly colors
        primary: {
          DEFAULT: '#3b82f6',       // blue-500 - tech blue
          hover: '#2563eb',        // blue-600
          light: '#60a5fa',        // blue-400
          muted: '#eff6ff',        // blue-50
          glow: 'rgba(59, 130, 246, 0.15)',
        },
      },
      backgroundColor: {
        'primary': 'var(--bg-primary)',
        'secondary': 'var(--bg-secondary)',
        'tertiary': 'var(--bg-tertiary)',
        'card': 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'muted': 'var(--text-muted)',
        'dim': 'var(--text-dim)',
      },
      borderColor: {
        'default': 'var(--border-default)',
        'hover': 'var(--border-hover)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px var(--accent-glow)',
        'glow-primary': '0 0 20px var(--primary-glow)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
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

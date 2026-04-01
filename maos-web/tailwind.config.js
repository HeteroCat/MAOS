/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agent: {
          master: '#8b5cf6',
          explore: '#3b82f6',
          plan: '#10b981',
          dev: '#f59e0b',
          verify: '#ef4444',
          general: '#6b7280',
        },
        status: {
          pending: '#9ca3af',
          running: '#3b82f6',
          completed: '#10b981',
          failed: '#ef4444',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}

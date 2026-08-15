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
        dark: {
          bg: '#0B0F19',       # Deep dark indigo backdrop
          card: '#161D30',     # Glassmorphic card fill
          border: '#242F4D',   # Deep borders
          text: '#F8FAFC',     # Slate-50 text
          muted: '#94A3B8',    # Slate-400 muted text
          accent: '#4F46E5',   # Premium Purple
          hover: '#1E294B',    # Hover state for card/buttons
        },
        semantic: {
          income: '#10B981',    # Green
          expense: '#F43F5E',   # Red/Rose
          review: '#F59E0B',    # Orange/Amber
          neutral: '#64748B'    # Slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(79, 70, 229, 0.15)',
      }
    },
  },
  plugins: [],
}

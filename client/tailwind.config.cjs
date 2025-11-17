module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'dark-blue': {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#e2e8f0',
          800: '#f1f5f9',
          900: '#f8fafc',
        },
      },
      boxShadow: {
        'glow': '0 0 40px rgba(59, 130, 246, 0.45)',
        'glow-lg': '0 0 60px rgba(59, 130, 246, 0.6)',
        'glow-emerald': '0 0 40px rgba(16, 185, 129, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out both',
        'slide-in-left': 'slideInLeft 0.6s ease-out both',
        'slide-in-right': 'slideInRight 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};

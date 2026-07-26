/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      zIndex: {
        55: '55',
      },
      colors: {
        primary: {
          DEFAULT: '#1E40AF',
          dark: '#1E3A8A',
          light: '#3B82F6',
        },
        accent: {
          DEFAULT: '#D4AF37',
          hover: '#B68D2A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
          light: '#F8FAFC',
        },
        border: '#E5E7EB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        },
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        fadeInUp: 'fadeInUp 0.5s ease-out forwards',
        slideInRight: 'slideInRight 0.5s ease-out forwards',
      },
      backgroundImage: {
        'chess-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")",
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 20px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12), 0 4px 15px rgba(0, 0, 0, 0.08)',
        gold: '0 4px 15px rgba(212, 175, 55, 0.3)',
        blue: '0 4px 15px rgba(30, 64, 175, 0.3)',
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

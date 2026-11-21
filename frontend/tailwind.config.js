/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas: '#F4F5F7',
        surface: '#FFFFFF',
        tile: '#F7F8FA',
        obsidian: {
          DEFAULT: '#161618',
          hover: '#26262A',
          soft: '#2C2C31',
        },
        coral: {
          50: '#FFF4F0',
          100: '#FFE5DC',
          200: '#FFC7B5',
          400: '#FF7D52',
          500: '#F55B2A',
          600: '#E5461B',
          700: '#C43612',
        },
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 2px 14px -4px rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        soft: '0 8px 30px -10px rgba(15, 23, 42, 0.08)',
        coral: '0 12px 26px -8px rgba(245, 91, 42, 0.42)',
      },
    },
  },
  plugins: [],
};

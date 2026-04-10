/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          root:    '#0d0d0d',
          topbar:  '#111111',
          panel:   '#161616',
          card:    '#1a1a1a',
          hover:   '#1f1f1f',
          input:   '#1a1a1a',
        },
        border: {
          subtle:  '#1e1e1e',
          DEFAULT: '#2a2a2a',
          focus:   '#444444',
        },
        accent: {
          DEFAULT: '#f5a623',
          hover:   '#f5b544',
          dim:     'rgba(245,166,35,0.12)',
        },
        tx: {
          primary:   '#e8e8e8',
          secondary: '#888888',
          dim:       '#444444',
          accent:    '#0d0d0d',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '10px',
      },
    },
  },
  plugins: [],
}
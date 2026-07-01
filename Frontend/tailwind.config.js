/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * London Eye Design System
       * Basado en el Figma: navy / red / royal-blue
       * Cada color tiene variantes para hover, active, backgrounds, etc.
       */
      colors: {
        navy: {
                50: '#f0f2f7',
                100: '#d8dde8',
                200: '#b1bbd1',
                300: '#8a99ba',
                400: '#6377a3',
                500: '#243352',  /* Base — sidebar, mas oscuro y menos saturado */
                600: '#1e2b45',
                700: '#182338',
                800: '#121b2b',
                900: '#0c131e',
              },
        royal: {
                  50: '#eef3fc',
                  100: '#d4e1f7',
                  200: '#a9c3ef',
                  300: '#7ea5e7',
                  400: '#5387df',
                  500: '#1a4fa0',  /* Base — links, mas sobrio */
                  600: '#164388',
                  700: '#123770',
                  800: '#0e2b58',
                  900: '#0a1f40',
                },
        accent: {
                  50: '#fef2f2',
                  100: '#fde8e8',
                  200: '#fbd5d5',
                  300: '#f8a4a4',
                  400: '#f07070',
                  500: '#b91c1c',  /* Base — CTAs, mas apagado */
                  600: '#a11818',
                  700: '#891515',
                  800: '#711212',
                  900: '#5a0f0f',
                },
        /* Neutrales para texto, bordes, fondos */
        surface: {
          50: '#f8fafc',   /* Fondo principal de pagina */
          100: '#f1f5f9',  /* Fondo de cards */
          200: '#e2e8f0',  /* Bordes suaves */
          300: '#cbd5e1',  /* Bordes activos */
          400: '#94a3b8',  /* Texto secundario */
          500: '#64748b',  /* Texto auxiliar */
          600: '#475569',  /* Texto normal */
          700: '#334155',  /* Texto principal */
          800: '#1e293b',  /* Headings */
          900: '#0f172a',  /* Texto maximo contraste */
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'section-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'card-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'small': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
        'input': '0.5rem',
        'badge': '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}

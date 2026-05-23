// Pegá este bloque dentro de `theme.extend` en tu tailwind.config.ts
// Asume que en app/layout.tsx cargaste las fuentes con next/font y expusiste
// las CSS variables --font-archivo, --font-archivo-black, --font-mono.

module.exports = {
  // ...
  theme: {
    extend: {
      colors: {
        // Brand
        orange: { DEFAULT: '#FF6B00' },
        purple: { DEFAULT: '#5B2D8E' },
        yellow: { DEFAULT: '#FFE040' },
        blue:   { DEFAULT: '#1565C0' },
        mint:   { DEFAULT: '#A8F0D8' },

        // Surfaces
        bg:      '#0A0A0A',
        panel:   '#141414',
        'panel-2': '#1C1C1C',
        line:    'rgba(255,255,255,0.08)',

        // Text
        muted:   '#8A8A8A',

        // Status (cuando necesitas el rojo crudo del live)
        live:    '#FF3B3B',
        'live-text': '#FF6B6B',
      },
      fontFamily: {
        sans:    ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo-black)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        chip: '14px',
      },
      maxWidth: {
        page: '1280px',
      },
      letterSpacing: {
        // Para títulos display
        tightest: '-0.04em',
        // Para labels uppercase de stats / eyebrows
        wider2: '0.18em',
        wider3: '0.22em',
      },
      boxShadow: {
        cta:       '0 10px 28px -10px rgba(255,107,0,0.6)',
        'cta-hover': '0 18px 36px -10px rgba(255,107,0,0.8)',
        tile:      '0 30px 80px -20px rgba(0,0,0,0.5)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0,0) rotate(0deg)' },
          '50%':      { transform: 'translate(20px,-30px) rotate(8deg)' },
        },
        blink: {
          '50%': { opacity: '0.2' },
        },
        pulseDot: {
          '0%':   { boxShadow: '0 0 0 0 rgba(168,240,216,0.7)' },
          '70%':  { boxShadow: '0 0 0 10px rgba(168,240,216,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(168,240,216,0)' },
        },
      },
      animation: {
        float:     'float 22s ease-in-out infinite',
        'float-2': 'float 28s ease-in-out infinite',
        'float-3': 'float 30s ease-in-out infinite',
        blink:     'blink 1.2s infinite',
        'pulse-dot': 'pulseDot 1.6s infinite',
      },
    },
  },
};

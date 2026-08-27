import type { Config } from 'tailwindcss';

// Design tokens live here, and only here. When the brand refresh
// (new logo + palette) is finalized, this is the one file that
// needs updating — no component should hardcode a hex value.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A365D',
          deep: '#072644',
          tint: '#E7EDF3',
        },
        accent: {
          DEFAULT: '#C1571A',
          deep: '#96430F',
          tint: '#FCEEE3',
        },
        paper: '#F8F7F3',
        line: '#E3E1D8',
        ink: {
          DEFAULT: '#10182B',
          soft: '#55597A',
        },
        success: {
          DEFAULT: '#3E7A4D',
          tint: '#EAF3EC',
        },
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;

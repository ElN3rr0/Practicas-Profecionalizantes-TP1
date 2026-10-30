import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0D0D',
        plum: '#381043',
        'lime-primary': '#B0F280',
        'lime-pastel': '#BEF299',
        'light-text': '#F2F2F2',
        surface: '#121212',
        'surface-card': '#171717',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        control: '0.5rem',
        container: '1rem',
        pill: '9999px',
      },
    },
  },
} satisfies Config;

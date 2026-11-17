import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17221e',
        muted: '#68756e',
        canvas: '#f5f7f3',
        forest: '#175b43',
        lime: '#c9ef74',
        line: '#e5e9e3',
      },
      boxShadow: {
        soft: '0 12px 40px rgba(27, 46, 36, 0.07)',
      },
    },
  },
  plugins: [],
};

export default config;

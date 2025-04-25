// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  // Garante que ele olhe nos lugares certos dentro de src/
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Suas customizações virão aqui
    },
  },
  plugins: [],
};
export default config;

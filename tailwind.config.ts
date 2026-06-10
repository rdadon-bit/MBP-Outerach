import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0f2240", light: "#1a3560", dark: "#0a1830" },
        gold: { DEFAULT: "#c9a227", light: "#e0bd4a" },
      },
    },
  },
  plugins: [],
};
export default config;

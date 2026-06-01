import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#faf9f5",
        ink: "#2f2a25",
        muted: "#776f66",
        line: "#e7dfd3",
        coral: "#cc785c",
        "coral-dark": "#a95d45",
        "technical-surface": "#25221f",
      },
      fontFamily: {
        sans: ["Inter", "Aptos", "Segoe UI", "Arial", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        hairline: "0 0 0 1px rgba(47, 42, 37, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "var(--bg-base)",
        "bg-card": "var(--bg-card)",
        "bg-card-2": "var(--bg-card-2)",
        "bg-input": "var(--bg-input)",
        "bg-overlay": "var(--bg-overlay)",
        accent: "var(--accent)",
        "t-primary": "var(--text-primary)",
        "t-secondary": "var(--text-secondary)",
        "t-tertiary": "var(--text-tertiary)",
      },
      fontFamily: {
        sans: ["GeistSans", "sans-serif"],
        mono: ["GeistMono", "monospace"],
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
    },
  },
  plugins: [],
};

export default config;

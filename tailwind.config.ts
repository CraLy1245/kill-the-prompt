import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13201f",
        muted: "#687b77",
        paper: "#f2f6f3",
        panel: "#ffffff",
        line: "rgba(204, 220, 213, 0.88)",
        accent: "#0f766e",
        accentSoft: "rgba(15, 118, 110, 0.1)",
        amberSoft: "rgba(217, 119, 6, 0.12)",
        stepic: {
          accent: "#0f766e",
          ink: "#13201f",
          muted: "#687b77",
          paper: "#f2f6f3",
          line: "rgba(204, 220, 213, 0.88)",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(35, 67, 62, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF8F1",
          100: "#DCEFE0",
          500: "#3A8348",
          600: "#2F6B3C",
          700: "#245530",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;

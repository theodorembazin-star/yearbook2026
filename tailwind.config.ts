import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        hand: ["Caveat", "cursive"],
      },
      colors: {
        ink: "#1a1410",
        cream: "#faf6ef",
        sepia: "#d9c7a7",
        accent: "#c4451c",
      },
      boxShadow: {
        polaroid: "0 6px 20px -6px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

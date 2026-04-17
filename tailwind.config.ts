import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ym: {
          purple: "#6f2da8",
          "purple-dark": "#4b1e73",
          "purple-light": "#a66ed9",
          cream: "#fef9f3",
          bubble: "#7c3fb4",
        },
      },
      fontFamily: {
        display: ["Impact", "Haettenschweiler", "Arial Narrow Bold", "sans-serif"],
      },
      boxShadow: {
        retro: "0 4px 0 0 rgba(75, 30, 115, 0.3)",
      },
      keyframes: {
        buzz: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-2px,2px)" },
          "40%": { transform: "translate(2px,-2px)" },
          "60%": { transform: "translate(-2px,-2px)" },
          "80%": { transform: "translate(2px,2px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        buzz: "buzz 0.4s linear",
        "fade-in-up": "fade-in-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        burrow: {
          base: "#0B0B0D",
          "sheet-top": "#0E0E10",
          card: "rgba(255,255,255,0.055)",
          "card-hover": "rgba(255,255,255,0.10)",
          hairline: "rgba(255,255,255,0.085)",
          track: "rgba(255,255,255,0.10)",
          text: "rgba(255,255,255,1)",
          "text-secondary": "rgba(255,255,255,0.62)",
          "text-tertiary": "rgba(255,255,255,0.40)",
          chip: "rgba(255,255,255,0.09)",
        },
        accent: {
          gold: "#E6A93C",
          teal: "#35C2A5",
          moss: "#6FB06A",
          violet: "#8E84F0",
          coral: "#F0714E",
          azure: "#4FA3E3",
          neutral: "#8F8F8F",
        },
        scrim: {
          gold: "#1A1A12",
          teal: "#0E2A27",
          moss: "#12241A",
          violet: "#1A1A2E",
          coral: "#2A1A17",
          azure: "#15222E",
          neutral: "#1A1A1A",
        },
        metric: {
          green: "#57D58E",
          gold: "#E6A93C",
          amber: "#F0B24A",
          orange: "#F2894E",
          blue: "#5AA8F0",
          red: "#F0604E",
          cpu: "#FF5F5F",
          mem: "#FFD75F",
          disk: "#A5D6A7",
          net: "#C79FD7",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', "system-ui", "sans-serif"],
        serif: ["Georgia", '"Times New Roman"', "serif"],
        mono: [
          '"Cascadia Code"',
          "Consolas",
          '"Courier New"',
          "monospace",
        ],
      },
      letterSpacing: {
        eyebrow: "0.08em",
        label: "0.07em",
        sublabel: "0.06em",
      },
      animation: {
        "progress-indeterminate": "progress-indeterminate 1.5s ease-in-out infinite",
      },
      keyframes: {
        "progress-indeterminate": {
          "0%": { transform: "translateX(-100%)", width: "60%" },
          "50%": { transform: "translateX(80%)", width: "50%" },
          "100%": { transform: "translateX(200%)", width: "40%" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

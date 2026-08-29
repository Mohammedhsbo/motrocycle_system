import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0051b8", // hero blue
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f0f6ff", // light blue background
          foreground: "#0051b8",
        },
        accent: {
          DEFAULT: "#003887", // darker blue for hover/accent
          foreground: "#ffffff",
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-down': 'fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 1s ease-out both',
        'zoom-in': 'zoom-in 1s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
